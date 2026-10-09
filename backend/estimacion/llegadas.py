"""La respuesta: ¿viene o no viene?

Las otras apps responden *cuándo*. Ésta responde ***si***, y la diferencia está
entera en un caso que ninguna cubre:

> **No hay ninguna 506 en camino.**

Con horarios programados eso es imposible de decir: el horario dice que pasa
cada diez minutos, y seguirá diciéndolo aunque no venga ninguna. Con las
posiciones de la flota se puede mirar el tramo del recorrido que está antes del
paradero y ver si hay un bus ahí o no lo hay.

Esto es lo que cambió el 9 de octubre de 2026. Hasta entonces hacía falta
telemetría de usuarios para saberlo, y la telemetría necesita usuarios que
todavía no existen.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from .flota import EstadoVehiculo, Flota

#: Velocidad de referencia cuando el bus no se está moviendo o no hay historia
#: suficiente. 5 m/s son 18 km/h, que es la velocidad comercial típica de una
#: micro en Santiago contando detenciones.
VELOCIDAD_REFERENCIA_MS = 5.0

#: Piso de velocidad para el cálculo. Sin esto, un bus detenido en un semáforo
#: da una espera infinita, que es a la vez verdad literal e inútil.
VELOCIDAD_MINIMA_MS = 1.5

#: Cuánto pesa la velocidad propia del vehículo frente a la de referencia,
#: cuando tiene historia suficiente. Ni una ni otra sola: la propia reacciona a
#: la congestión de ahora, la de referencia impide que un semáforo largo
#: dispare el ETA.
PESO_VELOCIDAD_PROPIA = 0.6

#: Incertidumbre relativa del ETA. **Provisional.** `docs/04` §4.6 dice que esto
#: no se supone sino que se mide, contrastando cada predicción con la llegada
#: que efectivamente ocurrió; para eso hacen falta semanas de historia que
#: todavía no existen. Mientras tanto se usa un 35%, que es deliberadamente
#: generoso: un rango ancho y honesto es mejor que uno estrecho e inventado.
INCERTIDUMBRE_RELATIVA = 0.35

#: Piso de la incertidumbre, en segundos. Aun con el bus a la vuelta de la
#: esquina hay un minuto de duda: el semáforo, la gente que sube, el conductor.
INCERTIDUMBRE_MINIMA_S = 60.0

#: Un bus que ya pasó el paradero por menos de esto probablemente está
#: detenido **en** el paradero, no lo dejó atrás. Es del orden del error de
#: posición más el largo de un bus.
TOLERANCIA_PASADO_M = 60.0

#: Hasta dónde se mira hacia atrás para decir «no viene ninguna». Más allá de
#: esto, que haya o no un bus no cambia la decisión de nadie: son más de veinte
#: minutos de viaje.
HORIZONTE_M = 8000.0


class Estado(str, Enum):
    """Los estados de `docs/04` §4.4 que hoy se pueden calcular.

    Faltan `DISCREPANCIA`, `PROBABLE_DESVIO` y `NO_LLEGARA`, que nacen de
    **contrastar** la fuente oficial con la telemetría propia. Con una sola
    fuente no hay desacuerdo que medir, y fingir que sí lo hay sería
    exactamente el error que el producto dice venir a corregir.
    """

    EN_RUTA = "en_ruta"
    #: Hay bus, pero lleva rato sin avanzar.
    DETENIDO = "detenido"
    #: Se alejó de su trazado más de lo tolerable.
    FUERA_DE_TRAZADO = "fuera_de_trazado"


@dataclass(frozen=True)
class Llegada:
    """Un bus concreto, acercándose a un paradero concreto."""

    vehiculo_id: str
    recorrido_id: str
    distancia_m: float
    eta_s: float
    sigma_s: float
    estado: Estado
    velocidad_ms: float

    @property
    def rango_s(self) -> tuple[float, float]:
        """El intervalo que se le muestra al usuario, no un número solo.

        Mostrar «7 min» es prometer algo que el dato no sostiene. Mostrar
        «5–10 min» dice lo mismo sin mentir, y es lo que la app dibuja.
        """
        return (max(0.0, self.eta_s - self.sigma_s), self.eta_s + self.sigma_s)


class Respuesta(str, Enum):
    VIENE = "viene"
    #: Ninguna unidad del recorrido en el tramo anterior al paradero.
    NO_VIENE = "no_viene"
    #: No hay posiciones frescas: no se sabe, y se dice.
    SIN_DATOS = "sin_datos"


@dataclass(frozen=True)
class Veredicto:
    """Lo que la app muestra arriba de todo."""

    respuesta: Respuesta
    llegadas: list[Llegada]
    #: Cuánto del recorrido hacia atrás se miró para concluir `NO_VIENE`.
    horizonte_m: float = HORIZONTE_M

    @property
    def proxima(self) -> Llegada | None:
        return self.llegadas[0] if self.llegadas else None


def _velocidad_util(v: EstadoVehiculo) -> float:
    from .flota import MUESTRAS_PARA_VELOCIDAD

    if v.muestras < MUESTRAS_PARA_VELOCIDAD:
        return VELOCIDAD_REFERENCIA_MS
    mezcla = (
        PESO_VELOCIDAD_PROPIA * v.velocidad_ms
        + (1 - PESO_VELOCIDAD_PROPIA) * VELOCIDAD_REFERENCIA_MS
    )
    return max(VELOCIDAD_MINIMA_MS, mezcla)


def estimar(
    vehiculo: EstadoVehiculo, s_paradero: float, *, ahora: datetime | None = None
) -> Llegada | None:
    """Estima cuándo llega **este** bus a **este** paradero.

    Devuelve ``None`` si el bus ya pasó: un bus que quedó atrás no es una
    llegada futura, y ofrecerlo como tal es el error más irritante que puede
    cometer una app de transporte.
    """
    distancia = s_paradero - vehiculo.s
    if distancia < -TOLERANCIA_PASADO_M:
        return None
    distancia = max(0.0, distancia)

    velocidad = _velocidad_util(vehiculo)
    eta = distancia / velocidad

    # La incertidumbre crece con el tiempo estimado, no con la distancia: media
    # hora de viaje tiene media hora de cosas que pueden pasar.
    sigma = math.sqrt(
        INCERTIDUMBRE_MINIMA_S**2 + (INCERTIDUMBRE_RELATIVA * eta) ** 2
    )

    if vehiculo.fuera_de_trazado:
        estado = Estado.FUERA_DE_TRAZADO
    elif (
        vehiculo.muestras >= 3
        and vehiculo.velocidad_ms < 0.5
        and distancia > TOLERANCIA_PASADO_M
    ):
        estado = Estado.DETENIDO
    else:
        estado = Estado.EN_RUTA

    return Llegada(
        vehiculo_id=vehiculo.vehiculo_id,
        recorrido_id=vehiculo.recorrido_id,
        distancia_m=distancia,
        eta_s=eta,
        sigma_s=sigma,
        estado=estado,
        velocidad_ms=velocidad,
    )


def responder(
    flota: Flota,
    recorrido_id: str,
    sentido: int | None,
    s_paradero: float,
    *,
    ahora: datetime,
    horizonte_m: float = HORIZONTE_M,
) -> Veredicto:
    """La respuesta completa para un recorrido en un paradero.

    `NO_VIENE` es la razón de ser del producto, y por eso se afirma con cuidado:
    hace falta que la fuente esté entregando posiciones frescas **de ese
    recorrido** y que ninguna caiga en el tramo anterior al paradero. Si no hay
    posiciones de nadie, la respuesta es `SIN_DATOS` y no `NO_VIENE`: no saber
    dónde están los buses no es lo mismo que saber que no hay ninguno, y
    confundirlos haría que la app diga «no viene» cada vez que se cae un
    servidor.
    """
    vehiculos = [
        v
        for v in flota.de_recorrido(recorrido_id, sentido)
        if not v.caducado(ahora)
    ]
    if not vehiculos:
        return Veredicto(Respuesta.SIN_DATOS, [], horizonte_m)

    llegadas = []
    for v in vehiculos:
        llegada = estimar(v, s_paradero, ahora=ahora)
        if llegada is not None and llegada.distancia_m <= horizonte_m:
            llegadas.append(llegada)
    llegadas.sort(key=lambda l: l.eta_s)

    if not llegadas:
        return Veredicto(Respuesta.NO_VIENE, [], horizonte_m)
    return Veredicto(Respuesta.VIENE, llegadas, horizonte_m)
