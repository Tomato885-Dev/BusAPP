"""Exporta una zona completa de la red para que la app funcione sin backend.

A diferencia de `cli.py paraderos`, que saca un puñado de paraderos, esto
exporta **toda la red dentro de un recuadro**: los paraderos con sus
coordenadas y los recorridos con su secuencia de paradas.

Con eso la app puede, sin servidor:

- dibujar los paraderos en el mapa donde realmente están;
- mostrar qué micros pasan por cada uno;
- y buscar viajes directos entre dos puntos, porque conoce el orden de las
  paradas de cada recorrido.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .parse import Feed, _a_segundos


@dataclass(frozen=True)
class Recuadro:
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float

    def contiene(self, lat: float, lon: float) -> bool:
        return self.lat_min <= lat <= self.lat_max and self.lon_min <= lon <= self.lon_max


# Códigos de paradero de superficie: PA215, PD410… El feed mezcla paraderos con
# andenes y accesos de Metro, cuyos identificadores son internos del sistema y
# no están escritos en ningún poste de la calle.
def _es_paradero_de_calle(codigo: str) -> bool:
    return (
        len(codigo) >= 3
        and codigo[0] == "P"
        and codigo[1].isalpha()
        and codigo[2:].isdigit()
    )


#: Tipos de GTFS que no son bus: 0 = tranvía o tren ligero, 1 = metro.
TIPOS_SOBRE_RIELES = (0, 1)


def _estaciones_sobre_rieles(feed: Feed) -> set[str]:
    """Paradas servidas por Metro o tren ligero.

    El filtro de paraderos de calle las descartaba a todas, y con ellas
    desaparecían las siete líneas del Metro y los dos trenes: sus estaciones no
    se codifican como ``PA123`` sino como ``MT_L5_V1``, sin código de paradero.
    """
    recorridos = {
        r.id for r in feed.recorridos.values() if r.tipo in TIPOS_SOBRE_RIELES
    }
    viajes = {v.id for v in feed.viajes.values() if v.recorrido_id in recorridos}
    return {p.parada_id for vid in viajes for p in feed.pasos_por_viaje(vid)}


def _limpiar_estacion(nombre: str) -> str:
    """Quita el sentido del nombre de una estación de Metro.

    El feed nombra cada andén por separado: «Monte Tabor Dirección Vicente
    Valdés». Al pasajero le sirve la estación, no el andén.
    """
    corte = nombre.find(" Dirección ")
    return (nombre[:corte] if corte > 0 else nombre).strip()


def _franjas_del_recorrido(
    feed: Feed, recorrido_id: str, sentido: int | None
) -> list[list[int]]:
    """Franjas horarias con su intervalo, para un recorrido y sentido.

    Cada viaje del feed cubre **una** franja del día, así que hay que unir las
    de todos los viajes del recorrido para tener la jornada completa. Tomar sólo
    el viaje representativo dejaba cada recorrido con un par de horas de
    cobertura y el resto del día sin dato.

    Si dos viajes declaran la misma franja con distinto intervalo, se conserva
    el más corto: dentro de un mismo sentido corresponde a la variante que más
    pasa por el tramo.
    """
    por_franja: dict[tuple[int, int], int] = {}
    for viaje in feed.viajes.values():
        if viaje.recorrido_id != recorrido_id or viaje.sentido != sentido:
            continue
        for f in feed.frecuencias.get(viaje.id, []):
            clave = (f.inicio_s, f.fin_s)
            previo = por_franja.get(clave)
            if previo is None or f.intervalo_s < previo:
                por_franja[clave] = f.intervalo_s
    return [
        [inicio, fin, intervalo]
        for (inicio, fin), intervalo in sorted(por_franja.items())
    ]


def _franjas_por_horario(
    feed: Feed, recorrido_id: str, sentido: int | None
) -> list[list[int]]:
    """Deduce franjas de frecuencia a partir de un horario fijo.

    El Metro de Santiago no declara ``frequencies.txt``: publica cada tren en
    ``stop_times.txt``. Sin esto sus seis líneas aparecían «fuera de servicio»
    las 24 horas, que es exactamente lo contrario de la verdad.

    Se cuentan las salidas de cada hora y se reparte la hora entre ellas: doce
    trenes entre las 8 y las 9 son uno cada cinco minutos. Es la lectura
    correcta para el pasajero, que no consulta el horario del Metro —llega y
    espera— y cuya pregunta real es cuánto.
    """
    propios = [
        v
        for v in feed.viajes.values()
        if v.recorrido_id == recorrido_id
        and (sentido is None or v.sentido == sentido)
    ]
    if not propios:
        return []

    # Un mismo recorrido trae los viajes de todos los calendarios: día hábil,
    # sábado y domingo. Contarlos juntos triplica la frecuencia y hace aparecer
    # un tren cada minuto donde pasa uno cada tres. Se toma el calendario con
    # más viajes, que es el día hábil.
    por_servicio: dict[str, int] = {}
    for v in propios:
        por_servicio[v.servicio_id] = por_servicio.get(v.servicio_id, 0) + 1
    servicio = max(por_servicio, key=lambda s: por_servicio[s])

    salidas: list[int] = []
    for viaje in propios:
        if viaje.servicio_id != servicio:
            continue
        pasos = feed.pasos_por_viaje(viaje.id)
        if not pasos:
            continue
        segundos = _a_segundos(pasos[0].hora_salida or pasos[0].hora_llegada or "")
        if segundos is not None:
            salidas.append(segundos)

    if len(salidas) < 2:
        return []

    por_hora: dict[int, int] = {}
    for s in salidas:
        por_hora[s // 3600] = por_hora.get(s // 3600, 0) + 1

    franjas = [
        [hora * 3600, (hora + 1) * 3600, max(60, round(3600 / cuantos))]
        for hora, cuantos in sorted(por_hora.items())
    ]
    return franjas


def exportar(feed: Feed, recuadro: Recuadro, destino: Path) -> dict[str, int]:
    """Exporta paraderos y recorridos de la zona a un JSON compacto."""
    sobre_rieles = _estaciones_sobre_rieles(feed)
    paraderos = {
        p.id: p
        for p in feed.paradas.values()
        if recuadro.contiene(p.lat, p.lon)
        and (_es_paradero_de_calle(p.codigo) or p.id in sobre_rieles)
    }

    # Un recorrido tiene muchos viajes casi idénticos. Se elige el que más
    # paradas toca dentro de la zona, y a igualdad se prefiere el que trae
    # frecuencias: sin ellas no se puede estimar una espera.
    #
    # **Uno por sentido, no uno por recorrido.** Guardar un solo viaje por
    # recorrido perdía entero el sentido contrario: la 517 pasa por PD310 sólo
    # de vuelta, y el paradero la mostraba como si no existiera. Son 309 de los
    # 427 recorridos del feed los que tienen dos sentidos, así que el error se
    # llevaba cerca de la mitad de la red.
    mejor_viaje: dict[tuple[str, int | None], tuple[int, int, str]] = {}
    for viaje in feed.viajes.values():
        dentro = [p for p in feed.pasos_por_viaje(viaje.id) if p.parada_id in paraderos]
        if len(dentro) < 2:
            continue
        tiene_frecuencia = 1 if feed.frecuencias.get(viaje.id) else 0
        clave = (len(dentro), tiene_frecuencia, viaje.id)
        llave = (viaje.recorrido_id, viaje.sentido)
        actual = mejor_viaje.get(llave)
        if actual is None or clave[:2] > actual[:2]:
            mejor_viaje[llave] = clave

    recorridos = []
    usados: set[str] = set()
    # Una parada que sirve a un tren y a micros se muestra como estación: es lo
    # que la hace reconocible en el mapa.
    tipo_por_parada: dict[str, int] = {}
    for (recorrido_id, sentido), (_, _, viaje_id) in mejor_viaje.items():
        recorrido = feed.recorridos.get(recorrido_id)
        viaje = feed.viajes.get(viaje_id)
        if recorrido is None or viaje is None:
            continue
        secuencia = [
            p.parada_id for p in feed.pasos_por_viaje(viaje_id) if p.parada_id in paraderos
        ]
        usados.update(secuencia)
        if recorrido.tipo in TIPOS_SOBRE_RIELES:
            for pid in secuencia:
                tipo_por_parada[pid] = recorrido.tipo
        frecuencias = _franjas_del_recorrido(feed, recorrido_id, viaje.sentido)
        if not frecuencias:
            frecuencias = _franjas_por_horario(feed, recorrido_id, viaje.sentido)
        recorridos.append({
            # El identificador lleva el sentido: son dos entradas distintas, y
            # cada una tiene su propio letrero de destino.
            "id": f"{recorrido.id}-{sentido}" if sentido is not None else recorrido.id,
            "nombre": recorrido.nombre_corto,
            "destino": viaje.letrero,
            "tipo": recorrido.tipo,
            "paradas": secuencia,
            "frecuencias": frecuencias,
        })

    # Un paradero que ningún recorrido de la zona toca no aporta nada al mapa.
    salida = {
        "paraderos": [
            {
                "id": p.id,
                "codigo": p.codigo or p.id,
                "nombre": (
                    _limpiar_estacion(p.nombre) if p.id in sobre_rieles else p.nombre
                ),
                "lat": round(p.lat, 5),
                "lon": round(p.lon, 5),
                # 3 = paradero de micro, 1 = estación de Metro, 0 = tren ligero.
                "tipo": tipo_por_parada.get(pid, 3),
            }
            for pid, p in paraderos.items()
            if pid in usados
        ],
        "recorridos": sorted(recorridos, key=lambda r: r["nombre"]),
    }

    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        json.dumps(salida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    return {
        "paraderos": len(salida["paraderos"]),
        "recorridos": len(salida["recorridos"]),
        "bytes": destino.stat().st_size,
    }
