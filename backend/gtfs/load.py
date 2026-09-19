"""Carga del feed a PostgreSQL + PostGIS.

Estrategia de actualización: **cargar en un esquema nuevo y hacer swap al
final**. Actualizar en vivo dejaría la app sirviendo un feed a medio cargar
durante varios minutos, con paraderos que existen y recorridos que todavía no.

    esquema_temporal  →  cargar todo  →  validar  →  RENAME  →  borrar el viejo

Las tablas propias del producto (telemetría, reportes, histórico de llegadas)
viven en el esquema ``public`` y no se tocan: el feed se reemplaza, los datos
acumulados no.

NOTA: este módulo todavía no ha sido ejecutado contra una base de datos real.
La lógica pura (lectura, geometría, validación) sí está cubierta por pruebas;
esto no. Correrlo por primera vez es parte de la tarea F0-1.
"""

from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from typing import Any, Iterator

from .parse import Feed
from .posiciones import ubicar_paradas

RUTA_ESQUEMA = Path(__file__).parent / "schema.sql"


def _a_intervalo(hora: str | None) -> timedelta | None:
    """Convierte una hora GTFS a intervalo.

    GTFS permite horas mayores a 24:00:00 para viajes que cruzan la medianoche
    ("25:30:00" es la 1:30 del día siguiente), y por eso se guarda como
    intervalo desde el inicio del día de servicio, no como hora del reloj.
    """
    if not hora:
        return None
    try:
        h, m, s = (int(parte) for parte in hora.split(":"))
    except ValueError:
        return None
    return timedelta(hours=h, minutes=m, seconds=s)


def _wkt_linea(trazado: list[tuple[float, float]]) -> str:
    """Trazado a WKT. Ojo: WKT va (lon lat), al revés que GTFS."""
    return "LINESTRING(" + ", ".join(f"{lon} {lat}" for lat, lon in trazado) + ")"


def filas_paradas(feed: Feed) -> Iterator[tuple[Any, ...]]:
    for p in feed.paradas.values():
        yield (p.id, p.codigo, p.nombre, f"POINT({p.lon} {p.lat})")


def filas_recorridos(feed: Feed) -> Iterator[tuple[Any, ...]]:
    for r in feed.recorridos.values():
        yield (r.id, r.nombre_corto, r.nombre_largo, r.tipo)


def filas_trazados(feed: Feed) -> Iterator[tuple[Any, ...]]:
    from .geo import largo_m

    for tid, trazado in feed.trazados.items():
        if len(trazado) < 2:
            continue
        yield (tid, _wkt_linea(trazado), largo_m(trazado))


def filas_viajes(feed: Feed) -> Iterator[tuple[Any, ...]]:
    for v in feed.viajes.values():
        trazado_id = v.trazado_id if v.trazado_id in feed.trazados else None
        yield (v.id, v.recorrido_id, v.servicio_id, v.letrero, trazado_id, v.sentido)


def filas_pasos(feed: Feed) -> Iterator[tuple[Any, ...]]:
    """Pasos por parada, con la posición sobre el trazado ya calculada.

    Es la parte cara de la ingesta: proyectar cada parada de cada viaje. Los
    viajes que comparten trazado y secuencia de paradas dan el mismo resultado,
    así que se memoiza por (trazado, paradas).
    """
    cache: dict[tuple[str, tuple[str, ...]], dict[int, tuple[float, float]]] = {}

    for viaje in feed.viajes.values():
        pasos = feed.pasos_por_viaje(viaje.id)
        if not pasos:
            continue

        posiciones: dict[int, tuple[float, float]] = {}
        if viaje.trazado_id and viaje.trazado_id in feed.trazados:
            clave = (viaje.trazado_id, tuple(p.parada_id for p in pasos))
            if clave not in cache:
                try:
                    ubicadas = ubicar_paradas(feed, viaje.id)
                    cache[clave] = {
                        u.orden: (u.distancia_recorrida, u.desviacion) for u in ubicadas
                    }
                except (KeyError, ValueError):
                    cache[clave] = {}
            posiciones = cache[clave]

        for paso in pasos:
            distancia, desviacion = posiciones.get(paso.orden, (None, None))
            yield (
                paso.viaje_id,
                paso.parada_id,
                paso.orden,
                _a_intervalo(paso.hora_llegada),
                _a_intervalo(paso.hora_salida),
                distancia,
                desviacion,
            )


def cargar(feed: Feed, dsn: str, *, esquema: str = "gtfs") -> dict[str, int]:
    """Carga el feed completo y hace swap atómico del esquema.

    Requiere ``psycopg`` instalado. Devuelve cuántas filas entraron en cada
    tabla, para poder compararlo contra el reporte de validación.
    """
    import psycopg  # import perezoso: la lógica pura no necesita la base

    temporal = f"{esquema}_nuevo"
    conteos: dict[str, int] = {}

    with psycopg.connect(dsn) as con:
        with con.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS postgis")
            cur.execute(f'DROP SCHEMA IF EXISTS "{temporal}" CASCADE')
            cur.execute(f'CREATE SCHEMA "{temporal}"')
            cur.execute(f'SET search_path TO "{temporal}"')
            cur.execute(RUTA_ESQUEMA.read_text(encoding="utf-8"))

            tablas = (
                ("paradas",    "(id, codigo, nombre, ubicacion)",
                 "(%s, %s, %s, ST_GeogFromText(%s))", filas_paradas),
                ("recorridos", "(id, nombre_corto, nombre_largo, tipo)",
                 "(%s, %s, %s, %s)", filas_recorridos),
                ("trazados",   "(id, linea, largo_m)",
                 "(%s, ST_GeogFromText(%s), %s)", filas_trazados),
                ("viajes",     "(id, recorrido_id, servicio_id, letrero, trazado_id, sentido)",
                 "(%s, %s, %s, %s, %s, %s)", filas_viajes),
                ("pasos",      "(viaje_id, parada_id, orden, hora_llegada, hora_salida,"
                               " distancia_recorrida, desviacion)",
                 "(%s, %s, %s, %s, %s, %s, %s)", filas_pasos),
            )

            for tabla, columnas, marcadores, generador in tablas:
                filas = list(generador(feed))
                if filas:
                    cur.executemany(
                        f"INSERT INTO {tabla} {columnas} VALUES {marcadores}", filas
                    )
                conteos[tabla] = len(filas)

            # Swap: el esquema viejo se retira y el nuevo toma su nombre, todo
            # dentro de la misma transacción.
            cur.execute(f'DROP SCHEMA IF EXISTS "{esquema}_viejo" CASCADE')
            cur.execute(
                f'ALTER SCHEMA "{esquema}" RENAME TO "{esquema}_viejo"'
                if _existe_esquema(cur, esquema) else "SELECT 1"
            )
            cur.execute(f'ALTER SCHEMA "{temporal}" RENAME TO "{esquema}"')
        con.commit()

    return conteos


def _existe_esquema(cur: Any, nombre: str) -> bool:
    cur.execute(
        "SELECT 1 FROM information_schema.schemata WHERE schema_name = %s", (nombre,)
    )
    return cur.fetchone() is not None
