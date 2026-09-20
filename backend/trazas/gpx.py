"""Lectura de archivos GPX.

Es el formato que exportan las aplicaciones de registro que usa cualquiera
—Geo Tracker, OpenTracks, GPX Logger—, así que es el formato de entrada de
toda la prueba de terreno (`docs/10`).

Se lee con `xml.etree`, que **no resuelve entidades externas**: un GPX es un
archivo que viene del teléfono de un usuario, y ahí un analizador que siga
referencias a archivos del sistema es un agujero. La otra defensa es el tamaño:
un GPX de un viaje en micro pesa cientos de kilobytes, así que se rechaza lo
que sea absurdamente grande antes de analizarlo.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from gtfs.geo import Punto, distancia_m

#: Un viaje en micro con un punto por segundo son unos 3 MB como mucho. Por
#: encima de esto no es una traza de un viaje, y no se analiza.
TAMANO_MAXIMO_BYTES = 50 * 1024 * 1024


@dataclass(frozen=True)
class PuntoTraza:
    """Un punto de la traza, con su hora."""

    lat: float
    lon: float
    t: datetime
    #: True si antes de este punto hubo un corte en la grabación. Importa: en
    #: Metro el GPS se pierde bajo tierra y la aplicación abre un segmento
    #: nuevo al salir, y ese corte es en sí mismo una señal.
    tras_corte: bool = False

    @property
    def punto(self) -> Punto:
        return (self.lat, self.lon)


@dataclass(frozen=True)
class Traza:
    """Una grabación completa."""

    nombre: str
    puntos: list[PuntoTraza]

    @property
    def duracion_s(self) -> float:
        if len(self.puntos) < 2:
            return 0.0
        return (self.puntos[-1].t - self.puntos[0].t).total_seconds()

    @property
    def largo_m(self) -> float:
        return sum(
            distancia_m(a.punto, b.punto)
            for a, b in zip(self.puntos, self.puntos[1:])
        )

    def resumen(self) -> str:
        return (
            f"{len(self.puntos)} puntos · "
            f"{self.duracion_s / 60:.0f} min · "
            f"{self.largo_m / 1000:.2f} km"
        )


def _sin_espacio_de_nombres(etiqueta: str) -> str:
    """`{http://topografix.com/GPX/1/1}trkpt` → `trkpt`."""
    return etiqueta.rsplit("}", 1)[-1]


_ZONA = re.compile(r"(Z|[+-]\d{2}:?\d{2})$")


def _a_fecha(texto: str) -> datetime | None:
    """Lee una hora de GPX, que en la práctica viene en varias formas.

    La especificación pide ISO 8601 en UTC, pero las aplicaciones reales traen
    milisegundos, `Z`, desfases con y sin dos puntos, y a veces nada. Sin hora
    no hay velocidad, y sin velocidad no se distingue una micro de un auto: por
    eso se intenta en serio antes de descartar un punto.
    """
    texto = texto.strip()
    if not texto:
        return None
    try:
        fecha = datetime.fromisoformat(texto.replace("Z", "+00:00"))
    except ValueError:
        return None
    # Sin zona horaria se asume UTC: para medir velocidades sólo importan las
    # diferencias, y mezclar naive con aware revienta al restarlas.
    if fecha.tzinfo is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(timezone.utc)


def leer(ruta: str | Path) -> Traza:
    """Lee un archivo GPX.

    Raises:
        ValueError: si el archivo es demasiado grande, no es GPX, o no trae
            ningún punto con hora.
    """
    ruta = Path(ruta)
    tamano = ruta.stat().st_size
    if tamano > TAMANO_MAXIMO_BYTES:
        raise ValueError(
            f"{ruta.name} pesa {tamano / 1e6:.0f} MB: no es la traza de un viaje"
        )

    raiz = ET.parse(ruta).getroot()
    if _sin_espacio_de_nombres(raiz.tag) != "gpx":
        raise ValueError(f"{ruta.name} no es un archivo GPX")

    puntos: list[PuntoTraza] = []
    sin_hora = 0
    for segmento in raiz.iter():
        if _sin_espacio_de_nombres(segmento.tag) != "trkseg":
            continue
        primero_del_segmento = True
        for nodo in segmento:
            if _sin_espacio_de_nombres(nodo.tag) != "trkpt":
                continue
            lat, lon = nodo.get("lat"), nodo.get("lon")
            if lat is None or lon is None:
                continue
            hora = None
            for hijo in nodo:
                if _sin_espacio_de_nombres(hijo.tag) == "time" and hijo.text:
                    hora = _a_fecha(hijo.text)
            if hora is None:
                sin_hora += 1
                continue
            puntos.append(
                PuntoTraza(
                    lat=float(lat),
                    lon=float(lon),
                    t=hora,
                    # El primer punto de un segmento que no es el primero de
                    # todos viene después de una pausa en la grabación.
                    tras_corte=primero_del_segmento and bool(puntos),
                )
            )
            primero_del_segmento = False

    if not puntos:
        cola = " (ninguno traía hora)" if sin_hora else ""
        raise ValueError(f"{ruta.name} no trae puntos utilizables{cola}")

    puntos.sort(key=lambda p: p.t)
    return Traza(nombre=ruta.stem, puntos=puntos)
