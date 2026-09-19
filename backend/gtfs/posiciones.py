"""Posición de cada parada a lo largo del trazado de su recorrido.

Es el dato derivado más importante de toda la ingesta, y **no viene en el GTFS**
de forma confiable: el campo ``shape_dist_traveled`` es opcional y muchos feeds
lo omiten o lo traen en unidades inconsistentes. Hay que calcularlo.

Sin esto no existe el motor de estimación. `docs/04` §4.2 calcula::

    distancia_restante = s_paradero − s_bus

donde ambas ``s`` son distancias medidas **a lo largo del recorrido**, no en
línea recta. Una micro a 400 m en línea recta puede estar a 3 km por el
recorrido si todavía no dobló.
"""

from __future__ import annotations

from dataclasses import dataclass

from .geo import Punto, largo_m, proyectar
from .parse import Feed

# Una parada a más de esta distancia de su propio trazado indica un problema de
# datos: trazado equivocado, parada mal georreferenciada, o un viaje que
# referencia un shape que no le corresponde.
#
# Calibrado contra el feed real del DTPM (muestra de 800 viajes, 33.125 paradas):
#
#     mediana        5,7 m
#     percentil 95  54,5 m
#     percentil 99 101,0 m
#     máximo       138,8 m
#
# Con 100 m se marcaba el 4,2% de las paradas, que es la dispersión normal del
# feed y no un problema. A 150 m el umbral queda por sobre el máximo observado,
# que es lo que corresponde a una alerta de calidad de datos: debe dispararse
# ante un error real, no ante el ruido habitual.
DESVIACION_SOSPECHOSA_M = 150.0


@dataclass(frozen=True)
class ParadaEnTrazado:
    """Una parada ubicada sobre el trazado de un recorrido."""

    parada_id: str
    orden: int
    distancia_recorrida: float  # metros desde el inicio del recorrido
    desviacion: float           # distancia de la parada al trazado

    @property
    def sospechosa(self) -> bool:
        return self.desviacion > DESVIACION_SOSPECHOSA_M


def ubicar_paradas(feed: Feed, viaje_id: str) -> list[ParadaEnTrazado]:
    """Ubica todas las paradas de un viaje sobre su trazado.

    Raises:
        KeyError: si el viaje no existe.
        ValueError: si el viaje no tiene trazado asociado.
    """
    viaje = feed.viajes[viaje_id]
    if viaje.trazado_id is None or viaje.trazado_id not in feed.trazados:
        raise ValueError(f"El viaje {viaje_id} no tiene trazado asociado")

    trazado = feed.trazados[viaje.trazado_id]
    ubicadas: list[ParadaEnTrazado] = []

    for paso in feed.pasos_por_viaje(viaje_id):
        parada = feed.paradas.get(paso.parada_id)
        if parada is None:
            continue
        proy = proyectar(parada.punto, trazado)
        ubicadas.append(
            ParadaEnTrazado(
                parada_id=parada.id,
                orden=paso.orden,
                distancia_recorrida=proy.distancia_recorrida,
                desviacion=proy.desviacion,
            )
        )

    return _forzar_monotonia(ubicadas, largo_m(trazado))


def _forzar_monotonia(
    paradas: list[ParadaEnTrazado], largo_trazado: float
) -> list[ParadaEnTrazado]:
    """Corrige paradas cuya proyección retrocede respecto de la anterior.

    Ocurre en recorridos que pasan dos veces por la misma calle: la proyección
    de una parada tardía puede caer en el tramo de ida. Como el orden de las
    paradas dentro del viaje sí es confiable, se usa ese orden para reproyectar
    hacia adelante.

    Se deja constancia del caso en vez de silenciarlo: si ocurre mucho, el
    trazado del feed tiene un problema real.
    """
    corregidas: list[ParadaEnTrazado] = []
    minimo = 0.0
    for parada in paradas:
        distancia = parada.distancia_recorrida
        if distancia < minimo:
            # No se puede recalcular sin ambigüedad; se empuja apenas hacia
            # adelante para preservar el orden, y se marca como sospechosa
            # subiendo su desviación por sobre el umbral.
            distancia = min(minimo + 1.0, largo_trazado)
            parada = ParadaEnTrazado(
                parada_id=parada.parada_id,
                orden=parada.orden,
                distancia_recorrida=distancia,
                desviacion=max(parada.desviacion, DESVIACION_SOSPECHOSA_M + 1.0),
            )
        corregidas.append(parada)
        minimo = max(minimo, distancia)
    return corregidas


def distancia_entre_paradas(
    paradas: list[ParadaEnTrazado], desde_id: str, hasta_id: str
) -> float | None:
    """Metros por el recorrido entre dos paradas del mismo viaje.

    Devuelve None si alguna no está en el viaje o si van en orden inverso.
    """
    por_id = {p.parada_id: p for p in paradas}
    a, b = por_id.get(desde_id), por_id.get(hasta_id)
    if a is None or b is None or b.orden <= a.orden:
        return None
    return b.distancia_recorrida - a.distancia_recorrida


def distancia_restante(
    posicion_bus: Punto, trazado: list[Punto], parada: ParadaEnTrazado
) -> float | None:
    """Metros que le faltan al bus para llegar a la parada, por el recorrido.

    Es el insumo directo de E₂ (`docs/04` §4.2). Devuelve None si el bus ya pasó
    la parada, que es justamente el caso en que no hay que mostrar un ETA.
    """
    proy = proyectar(posicion_bus, trazado)
    restante = parada.distancia_recorrida - proy.distancia_recorrida
    return restante if restante > 0 else None
