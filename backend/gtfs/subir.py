"""Sube la red a Supabase.

Carga paraderos, recorridos y pasos —con la distancia recorrida ya calculada y
las frecuencias oficiales— a la base de Supabase.

Usa la **cadena de conexión directa de Postgres**, no la API REST: son decenas
de miles de filas y pasarlas por PostgREST sería lentísimo. Esa conexión usa la
contraseña de la base, que omite las políticas de seguridad por fila; por eso
este proceso corre en el servidor y nunca dentro de la aplicación.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from .exportar_zona import Recuadro, _es_paradero_de_calle, _franjas_del_recorrido
from .geo import largo_m
from .parse import Feed
from .posiciones import ubicar_paradas

# Cuántas filas por sentencia. Lotes muy grandes agotan memoria en el servidor
# y muy chicos multiplican los viajes de ida y vuelta.
LOTE = 1000


def _en_lotes(filas: list, tamano: int = LOTE) -> Iterable[list]:
    for i in range(0, len(filas), tamano):
        yield filas[i : i + tamano]


def preparar(feed: Feed, recuadro: Recuadro | None = None) -> dict[str, list[tuple]]:
    """Arma las filas a insertar, sin tocar la base.

    Separar la preparación de la escritura permite probar esta parte —que es
    donde está la lógica— sin necesitar una base de datos.
    """
    paraderos = {
        p.id: p
        for p in feed.paradas.values()
        if _es_paradero_de_calle(p.codigo)
        and (recuadro is None or recuadro.contiene(p.lat, p.lon))
    }

    # Viaje representativo por recorrido: el que más paradas toca, prefiriendo
    # los que traen frecuencias.
    mejor: dict[str, tuple[int, int, str]] = {}
    for viaje in feed.viajes.values():
        dentro = [p for p in feed.pasos_por_viaje(viaje.id) if p.parada_id in paraderos]
        if len(dentro) < 2:
            continue
        clave = (len(dentro), 1 if feed.frecuencias.get(viaje.id) else 0, viaje.id)
        actual = mejor.get(viaje.recorrido_id)
        if actual is None or clave[:2] > actual[:2]:
            mejor[viaje.recorrido_id] = clave

    filas_recorridos: list[tuple] = []
    filas_pasos: list[tuple] = []
    usados: set[str] = set()

    for recorrido_id, (_, _, viaje_id) in mejor.items():
        recorrido = feed.recorridos.get(recorrido_id)
        viaje = feed.viajes.get(viaje_id)
        if recorrido is None or viaje is None:
            continue

        posiciones: dict[str, float] = {}
        if viaje.trazado_id and len(feed.trazados.get(viaje.trazado_id, [])) >= 2:
            try:
                for u in ubicar_paradas(feed, viaje_id):
                    posiciones[u.parada_id] = u.distancia_recorrida
            except (KeyError, ValueError):
                pass

        orden = 0
        for paso in feed.pasos_por_viaje(viaje_id):
            if paso.parada_id not in paraderos:
                continue
            filas_pasos.append(
                (recorrido_id, paso.parada_id, orden, posiciones.get(paso.parada_id))
            )
            usados.add(paso.parada_id)
            orden += 1

        if orden < 2:
            # Sin al menos dos paradas en la zona el recorrido no sirve de nada.
            filas_pasos = [f for f in filas_pasos if f[0] != recorrido_id]
            continue

        import json

        filas_recorridos.append((
            recorrido.id,
            recorrido.nombre_corto,
            viaje.letrero,
            recorrido.tipo,
            json.dumps(_franjas_del_recorrido(feed, recorrido_id, viaje.sentido)),
        ))

    filas_paraderos = [
        (p.id, p.codigo, p.nombre, f"POINT({p.lon} {p.lat})")
        for pid, p in paraderos.items()
        if pid in usados
    ]

    return {
        "paraderos": filas_paraderos,
        "recorridos": filas_recorridos,
        "pasos": [f for f in filas_pasos if f[1] in usados],
    }


def escribir_csv(feed: Feed, carpeta: Path, recuadro: Recuadro | None = None) -> dict[str, int]:
    """Escribe la red como tres CSV listos para importar a mano en Supabase.

    Existe para no obligar a instalar Python a quien sólo quiere cargar los
    datos una vez: el panel de Supabase importa CSV desde el navegador.

    El orden de importación importa por las llaves foráneas:
    paraderos → recorridos → pasos.

    La columna `ubicacion` se escribe como texto WKT (`POINT(lon lat)`), que
    PostGIS convierte solo al insertarlo en una columna `geography`.
    """
    import csv

    datos = preparar(feed, recuadro)
    carpeta.mkdir(parents=True, exist_ok=True)
    conteos: dict[str, int] = {}

    tablas = (
        ("1-paraderos.csv", ["id", "codigo", "nombre", "ubicacion"], datos["paraderos"]),
        ("2-recorridos.csv", ["id", "nombre", "destino", "tipo", "frecuencias"], datos["recorridos"]),
        ("3-pasos.csv", ["recorrido_id", "paradero_id", "orden", "distancia_recorrida"], datos["pasos"]),
    )

    for nombre, columnas, filas in tablas:
        ruta = carpeta / nombre
        with ruta.open("w", encoding="utf-8", newline="") as f:
            escritor = csv.writer(f)
            escritor.writerow(columnas)
            escritor.writerows(filas)
        conteos[nombre] = len(filas)

    return conteos


def subir(feed: Feed, dsn: str, recuadro: Recuadro | None = None) -> dict[str, int]:
    """Reemplaza la red completa en Supabase, en una sola transacción.

    Se borra y se vuelve a escribir dentro de la misma transacción: si algo
    falla a mitad de camino, la base queda con la red anterior intacta en vez
    de quedar a medio cargar.
    """
    import psycopg

    datos = preparar(feed, recuadro)
    conteos: dict[str, int] = {}

    with psycopg.connect(dsn) as con:
        with con.cursor() as cur:
            # El orden importa por las llaves foráneas.
            cur.execute("truncate pasos, recorridos, paraderos cascade")

            for lote in _en_lotes(datos["paraderos"]):
                cur.executemany(
                    "insert into paraderos (id, codigo, nombre, ubicacion)"
                    " values (%s, %s, %s, st_geogfromtext(%s))",
                    lote,
                )
            conteos["paraderos"] = len(datos["paraderos"])

            for lote in _en_lotes(datos["recorridos"]):
                cur.executemany(
                    "insert into recorridos (id, nombre, destino, tipo, frecuencias)"
                    " values (%s, %s, %s, %s, %s::jsonb)",
                    lote,
                )
            conteos["recorridos"] = len(datos["recorridos"])

            for lote in _en_lotes(datos["pasos"]):
                cur.executemany(
                    "insert into pasos (recorrido_id, paradero_id, orden, distancia_recorrida)"
                    " values (%s, %s, %s, %s)",
                    lote,
                )
            conteos["pasos"] = len(datos["pasos"])

        con.commit()

    return conteos
