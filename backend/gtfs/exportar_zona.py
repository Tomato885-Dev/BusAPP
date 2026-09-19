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


def exportar(feed: Feed, recuadro: Recuadro, destino: Path) -> dict[str, int]:
    """Exporta paraderos y recorridos de la zona a un JSON compacto."""
    paraderos = {
        p.id: p
        for p in feed.paradas.values()
        if recuadro.contiene(p.lat, p.lon) and _es_paradero_de_calle(p.codigo)
    }

    # Un recorrido puede tener muchos viajes casi idénticos. Basta el que más
    # paradas toca dentro de la zona: es el que mejor la representa.
    mejor_viaje: dict[str, tuple[int, str]] = {}
    for viaje in feed.viajes.values():
        dentro = [p for p in feed.pasos_por_viaje(viaje.id) if p.parada_id in paraderos]
        if len(dentro) < 2:
            continue
        actual = mejor_viaje.get(viaje.recorrido_id)
        if actual is None or len(dentro) > actual[0]:
            mejor_viaje[viaje.recorrido_id] = (len(dentro), viaje.id)

    recorridos = []
    usados: set[str] = set()
    for recorrido_id, (_, viaje_id) in mejor_viaje.items():
        recorrido = feed.recorridos.get(recorrido_id)
        viaje = feed.viajes.get(viaje_id)
        if recorrido is None or viaje is None:
            continue
        secuencia = [
            p.parada_id for p in feed.pasos_por_viaje(viaje_id) if p.parada_id in paraderos
        ]
        usados.update(secuencia)
        recorridos.append({
            "id": recorrido.id,
            "nombre": recorrido.nombre_corto,
            "destino": viaje.letrero,
            "tipo": recorrido.tipo,
            "paradas": secuencia,
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
