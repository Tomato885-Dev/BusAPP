"""Geometría sobre recorridos.

Este módulo es la base de todo el motor de estimación (`docs/04`). La pregunta
que responde es siempre la misma: **dado un punto GPS, ¿en qué parte del
recorrido está?**

De ahí salen las tres magnitudes que el motor necesita:

- ``distancia_recorrida``: cuánto avanzó a lo largo del trazado. Es la ``s`` de
  `docs/04` §4.2, y con ella se calcula la distancia que falta hasta el paradero.
- ``desviacion``: a qué distancia perpendicular quedó del trazado. Es la señal de
  desvío de `docs/04` §4.4.
- ``indice_segmento``: en qué tramo del trazado cayó, para consultar velocidades
  históricas de ese tramo.

Se trabaja en una proyección local plana. Para el tamaño de Santiago el error es
de centímetros, muy por debajo de la precisión del GPS, y evita depender de
librerías geoespaciales para el cálculo más frecuente del sistema.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Sequence

RADIO_TIERRA_M = 6_371_008.8

Punto = tuple[float, float]  # (lat, lon) en grados


# --------------------------------------------------------------------------- #
# Proyección local
# --------------------------------------------------------------------------- #

def a_plano(lat: float, lon: float, lat_ref: float) -> tuple[float, float]:
    """Proyecta (lat, lon) a metros en un plano local centrado en ``lat_ref``."""
    x = math.radians(lon) * RADIO_TIERRA_M * math.cos(math.radians(lat_ref))
    y = math.radians(lat) * RADIO_TIERRA_M
    return x, y


def distancia_m(a: Punto, b: Punto) -> float:
    """Distancia en metros entre dos puntos (fórmula de haversine)."""
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * RADIO_TIERRA_M * math.asin(math.sqrt(h))


# --------------------------------------------------------------------------- #
# Trazados
# --------------------------------------------------------------------------- #

def distancias_acumuladas(trazado: Sequence[Punto]) -> list[float]:
    """Distancia acumulada en metros hasta cada vértice del trazado."""
    if not trazado:
        return []
    acum = [0.0]
    for anterior, actual in zip(trazado, trazado[1:]):
        acum.append(acum[-1] + distancia_m(anterior, actual))
    return acum


def largo_m(trazado: Sequence[Punto]) -> float:
    """Largo total del trazado en metros."""
    acum = distancias_acumuladas(trazado)
    return acum[-1] if acum else 0.0


@dataclass(frozen=True)
class Proyeccion:
    """Resultado de proyectar un punto sobre un trazado."""

    distancia_recorrida: float  # metros a lo largo del trazado (la ``s`` de docs/04)
    desviacion: float           # metros perpendiculares al trazado
    indice_segmento: int        # segmento donde cayó la proyección
    posicion_en_segmento: float # 0 = inicio del segmento, 1 = fin


def _proyectar_en_segmento(
    px: float, py: float, ax: float, ay: float, bx: float, by: float
) -> tuple[float, float, float]:
    """Proyecta el punto P sobre el segmento AB, acotado a sus extremos."""
    dx, dy = bx - ax, by - ay
    largo2 = dx * dx + dy * dy
    if largo2 == 0.0:  # segmento degenerado: A y B coinciden
        return ax, ay, 0.0
    t = ((px - ax) * dx + (py - ay) * dy) / largo2
    t = max(0.0, min(1.0, t))
    return ax + t * dx, ay + t * dy, t


def proyectar(punto: Punto, trazado: Sequence[Punto]) -> Proyeccion:
    """Proyecta un punto GPS sobre un trazado.

    Recorre todos los segmentos y se queda con el más cercano. Es O(n) por
    llamada; para trazados largos conviene acotar la búsqueda a una ventana
    alrededor de la posición anterior conocida del vehículo (ver
    `proyectar_secuencia`).

    Raises:
        ValueError: si el trazado tiene menos de dos puntos.
    """
    if len(trazado) < 2:
        raise ValueError("El trazado necesita al menos dos puntos")

    lat_ref = trazado[0][0]
    px, py = a_plano(punto[0], punto[1], lat_ref)
    plano = [a_plano(lat, lon, lat_ref) for lat, lon in trazado]
    acum = distancias_acumuladas(trazado)

    mejor = Proyeccion(0.0, math.inf, 0, 0.0)
    for i, ((ax, ay), (bx, by)) in enumerate(zip(plano, plano[1:])):
        qx, qy, t = _proyectar_en_segmento(px, py, ax, ay, bx, by)
        desviacion = math.hypot(px - qx, py - qy)
        if desviacion < mejor.desviacion:
            largo_segmento = acum[i + 1] - acum[i]
            mejor = Proyeccion(
                distancia_recorrida=acum[i] + t * largo_segmento,
                desviacion=desviacion,
                indice_segmento=i,
                posicion_en_segmento=t,
            )
    return mejor


def proyectar_secuencia(
    puntos: Iterable[Punto],
    trazado: Sequence[Punto],
    *,
    retroceso_maximo_m: float = 150.0,
) -> list[Proyeccion]:
    """Proyecta una traza GPS completa imponiendo avance monótono.

    Un bus no retrocede. Sin esta restricción, el ruido del GPS cerca de un
    trazado que se cruza consigo mismo —habitual en recorridos de ida y vuelta—
    hace que la proyección salte hacia atrás varios kilómetros.

    Se permite un retroceso pequeño (``retroceso_maximo_m``) porque el ruido
    real del GPS sí produce retrocesos de algunas decenas de metros.
    """
    resultados: list[Proyeccion] = []
    avance_minimo = 0.0
    for punto in puntos:
        proy = proyectar(punto, trazado)
        if proy.distancia_recorrida < avance_minimo - retroceso_maximo_m:
            proy = _proyectar_hacia_adelante(punto, trazado, avance_minimo)
        resultados.append(proy)
        avance_minimo = max(avance_minimo, proy.distancia_recorrida)
    return resultados


def _proyectar_hacia_adelante(
    punto: Punto, trazado: Sequence[Punto], desde_m: float
) -> Proyeccion:
    """Proyecta considerando sólo la parte del trazado posterior a ``desde_m``."""
    acum = distancias_acumuladas(trazado)

    # El segmento que *contiene* ``desde_m``: el último cuyo vértice inicial no
    # lo supera. Buscar en cambio el primero cuyo vértice final lo alcanza elige
    # el segmento anterior cuando ``desde_m`` cae justo sobre un vértice —que es
    # el caso habitual, porque la posición previa suele venir de proyectar sobre
    # uno— y la proyección vuelve a retroceder.
    primer_segmento = 0
    for i in range(len(acum) - 1):
        if acum[i] > desde_m:
            break
        primer_segmento = i

    sub = list(trazado[primer_segmento:])
    if len(sub) < 2:
        return proyectar(punto, trazado)

    proy = proyectar(punto, sub)
    return Proyeccion(
        distancia_recorrida=acum[primer_segmento] + proy.distancia_recorrida,
        desviacion=proy.desviacion,
        indice_segmento=primer_segmento + proy.indice_segmento,
        posicion_en_segmento=proy.posicion_en_segmento,
    )


def punto_a_distancia(trazado: Sequence[Punto], distancia_m_: float) -> Punto:
    """Punto del trazado que está a ``distancia_m_`` del inicio.

    Es la operación inversa de `proyectar`, y sirve para dibujar un bus sobre el
    mapa a partir de su distancia recorrida.
    """
    if len(trazado) < 2:
        raise ValueError("El trazado necesita al menos dos puntos")

    acum = distancias_acumuladas(trazado)
    if distancia_m_ <= 0:
        return trazado[0]
    if distancia_m_ >= acum[-1]:
        return trazado[-1]

    for i in range(len(acum) - 1):
        if acum[i + 1] >= distancia_m_:
            largo_segmento = acum[i + 1] - acum[i]
            t = (distancia_m_ - acum[i]) / largo_segmento if largo_segmento else 0.0
            (lat1, lon1), (lat2, lon2) = trazado[i], trazado[i + 1]
            return (lat1 + t * (lat2 - lat1), lon1 + t * (lon2 - lon1))
    return trazado[-1]
