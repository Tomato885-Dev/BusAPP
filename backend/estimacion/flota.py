"""Dónde va cada bus, a lo largo de su recorrido.

Una posición suelta —latitud y longitud— no sirve para estimar nada. Lo que el
motor necesita es la **distancia recorrida sobre el trazado**: una micro a 400 m
en línea recta puede estar a 3 km por el recorrido si todavía no dobló.

Este módulo mantiene ese estado para toda la flota, muestra a muestra.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from gtfs.geo import TrazadoIndexado, distancia_m

#: Cuánta historia se guarda de cada bus. Diez minutos alcanzan para estimar su
#: velocidad reciente sin que un tramo detenido hace un cuarto de hora siga
#: pesando cuando el bus ya volvió a andar.
MEMORIA_S = 600.0

#: Más lejos que esto del trazado de su propio recorrido, el bus no está donde
#: dice estar. Es el umbral de `docs/04` §4.4: desvío, dato equivocado o un
#: vehículo asignado a un recorrido que no está haciendo.
DESVIO_M = 150.0

#: Sin al menos estas muestras no se confía en la velocidad propia del vehículo.
MUESTRAS_PARA_VELOCIDAD = 3

#: Una posición más vieja que esto ya no dice dónde está el bus ahora.
CADUCIDAD_S = 180.0


@dataclass(frozen=True)
class Posicion:
    """Una muestra cruda de la fuente, ya normalizada.

    Es deliberadamente mínima y **no** copia la forma del servicio del DTPM: el
    adaptador traduce a esto, y el motor no sabe de dónde viene. Es la regla de
    `docs/01` §1.5, y es lo que permite sumar la telemetría propia después sin
    tocar nada de esto.
    """

    vehiculo_id: str
    recorrido_id: str
    sentido: int | None
    lat: float
    lon: float
    t: datetime
    #: Velocidad informada por la fuente, si la trae. No se usa como verdad:
    #: sirve para contrastar la que se calcula de las posiciones sucesivas.
    velocidad_ms: float | None = None


@dataclass
class EstadoVehiculo:
    """Dónde está un bus y a qué velocidad viene."""

    vehiculo_id: str
    recorrido_id: str
    sentido: int | None
    #: Distancia recorrida sobre el trazado, en metros. La ``s`` de `docs/04`.
    s: float
    desviacion_m: float
    t: datetime
    #: Velocidad de avance **sobre el trazado**, no en línea recta.
    velocidad_ms: float
    muestras: int
    historia: deque[tuple[datetime, float]] = field(repr=False, default_factory=deque)

    @property
    def fuera_de_trazado(self) -> bool:
        return self.desviacion_m > DESVIO_M

    def caducado(self, ahora: datetime) -> bool:
        return (ahora - self.t).total_seconds() > CADUCIDAD_S


class Flota:
    """El estado de todos los buses, actualizado muestra a muestra.

    Guarda la historia reciente de cada vehículo porque la velocidad no se puede
    sacar de una sola posición, y porque la velocidad que importa es la de
    avance **a lo largo del recorrido**: un bus dando la vuelta en un paradero
    de intercambio se mueve mucho en línea recta y avanza cero por su trazado.
    """

    def __init__(self, trazados: dict[tuple[str, int | None], TrazadoIndexado]):
        self.trazados = trazados
        self.vehiculos: dict[str, EstadoVehiculo] = {}
        #: Posiciones que no se pudieron ubicar, para poder contarlas. Una
        #: fuente que de pronto trae recorridos desconocidos es una fuente que
        #: cambió, y eso hay que verlo antes de que lo vea el usuario.
        self.sin_trazado: int = 0

    def actualizar(self, posiciones: list[Posicion]) -> None:
        for p in posiciones:
            trazado = self.trazados.get((p.recorrido_id, p.sentido))
            if trazado is None and p.sentido is not None:
                trazado = self.trazados.get((p.recorrido_id, None))
            if trazado is None:
                self.sin_trazado += 1
                continue

            previo = self.vehiculos.get(p.vehiculo_id)
            # Se proyecta hacia adelante desde donde estaba: un bus no
            # retrocede, y en un recorrido que se cruza consigo mismo la
            # proyección libre salta kilómetros.
            desde = previo.s if previo and previo.recorrido_id == p.recorrido_id else 0.0
            s, desviacion = trazado.proyectar((p.lat, p.lon), desde_m=desde)

            historia = previo.historia if previo and previo.recorrido_id == p.recorrido_id else deque()
            historia.append((p.t, s))
            while historia and (p.t - historia[0][0]).total_seconds() > MEMORIA_S:
                historia.popleft()

            self.vehiculos[p.vehiculo_id] = EstadoVehiculo(
                vehiculo_id=p.vehiculo_id,
                recorrido_id=p.recorrido_id,
                sentido=p.sentido,
                s=s,
                desviacion_m=desviacion,
                t=p.t,
                velocidad_ms=_velocidad(historia),
                muestras=len(historia),
                historia=historia,
            )

    def olvidar_viejos(self, ahora: datetime) -> int:
        """Saca de la flota los buses que dejaron de reportar."""
        viejos = [v for v, e in self.vehiculos.items() if e.caducado(ahora)]
        for v in viejos:
            del self.vehiculos[v]
        return len(viejos)

    def de_recorrido(self, recorrido_id: str, sentido: int | None) -> list[EstadoVehiculo]:
        return [
            e
            for e in self.vehiculos.values()
            if e.recorrido_id == recorrido_id
            and (sentido is None or e.sentido is None or e.sentido == sentido)
        ]


def _velocidad(historia: deque[tuple[datetime, float]]) -> float:
    """Avance sobre el trazado por segundo, entre los extremos de la historia.

    Entre los extremos y no promediando tramo a tramo: el error de posición de
    cada muestra se cancela al mirar la diferencia total, y se acumula al
    sumarla por partes. Es el mismo defecto que inflaba al triple el largo de
    las trazas GPS (`docs/14`).
    """
    if len(historia) < 2:
        return 0.0
    (t0, s0), (t1, s1) = historia[0], historia[-1]
    dt = (t1 - t0).total_seconds()
    if dt <= 0:
        return 0.0
    return max(0.0, (s1 - s0) / dt)
