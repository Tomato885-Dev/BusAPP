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

from .parse import Feed


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


def exportar(feed: Feed, recuadro: Recuadro, destino: Path) -> dict[str, int]:
    """Exporta paraderos y recorridos de la zona a un JSON compacto."""
    paraderos = {
        p.id: p
        for p in feed.paradas.values()
        if recuadro.contiene(p.lat, p.lon) and _es_paradero_de_calle(p.codigo)
    }

    # Un recorrido tiene muchos viajes casi idénticos. Se elige el que más
    # paradas toca dentro de la zona, y a igualdad se prefiere el que trae
    # frecuencias: sin ellas no se puede estimar una espera.
    mejor_viaje: dict[str, tuple[int, int, str]] = {}
    for viaje in feed.viajes.values():
        dentro = [p for p in feed.pasos_por_viaje(viaje.id) if p.parada_id in paraderos]
        if len(dentro) < 2:
            continue
        tiene_frecuencia = 1 if feed.frecuencias.get(viaje.id) else 0
        clave = (len(dentro), tiene_frecuencia, viaje.id)
        actual = mejor_viaje.get(viaje.recorrido_id)
        if actual is None or clave[:2] > actual[:2]:
            mejor_viaje[viaje.recorrido_id] = clave

    recorridos = []
    usados: set[str] = set()
    for recorrido_id, (_, _, viaje_id) in mejor_viaje.items():
        recorrido = feed.recorridos.get(recorrido_id)
        viaje = feed.viajes.get(viaje_id)
        if recorrido is None or viaje is None:
            continue
        secuencia = [
            p.parada_id for p in feed.pasos_por_viaje(viaje_id) if p.parada_id in paraderos
        ]
        usados.update(secuencia)
        frecuencias = _franjas_del_recorrido(feed, recorrido_id, viaje.sentido)
        recorridos.append({
            "id": recorrido.id,
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
                "codigo": p.codigo,
                "nombre": p.nombre,
                "lat": round(p.lat, 5),
                "lon": round(p.lon, 5),
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
