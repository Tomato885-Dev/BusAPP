"""Partir una traza en tramos: caminando, a bordo, detenido.

Por qué importa: el protocolo de grabación (`docs/10`) pide grabar **desde
antes de subirse hasta después de bajarse**, y eso no es capricho. Los tramos
caminando son justamente lo que permite comprobar si el sistema sabe detectar
solo dónde empezó y dónde terminó el viaje en micro. Si hubiera que apretar un
botón al subir, el producto dejaría de funcionar sin que el usuario colabore, y
entonces no hay telemetría pasiva (`docs/01` §1.4).

La velocidad de un punto aislado no sirve para clasificar nada: el GPS de un
teléfono quieto «camina» solo, y una micro atrapada en un semáforo va a la
velocidad de un peatón. Por eso todo se decide sobre la velocidad **suavizada
en una ventana de tiempo**, y después se descartan los tramos demasiado cortos
para ser reales.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from statistics import median

from gtfs.geo import distancia_m
from .gpx import PuntoTraza, Traza


class Tipo(str, Enum):
    DETENIDO = "detenido"
    CAMINANDO = "caminando"
    VEHICULO = "vehiculo"


#: Debajo de esto la persona no se mueve: es ruido del GPS. Un teléfono quieto
#: a cielo abierto se desplaza solo entre 0,3 y 0,8 m/s según la constelación
#: visible, así que el umbral va por arriba de eso.
QUIETO_MS = 0.9

#: Entre `QUIETO_MS` y esto, va caminando. 2,5 m/s son 9 km/h: una persona
#: apurada camina a 1,8 y trota a 3. El límite alto deja del lado de «caminando»
#: los casos dudosos, que es lo conservador: confundir una micro con una caminata
#: pierde un viaje; confundir una caminata con una micro contamina el motor.
CAMINANDO_MS = 2.5

#: Ventana de suavizado. Medio minuto cubre un semáforo largo sin borrar la
#: parada en un paradero, que dura entre 10 y 30 segundos.
VENTANA_S = 30.0

#: Sobre cuánto tiempo se mide la velocidad.
#:
#: **Éste es el número que hace que todo lo demás funcione.** Con un punto por
#: segundo, la distancia entre dos muestras consecutivas de una micro son unos
#: 6 m, y el error del GPS otros 10: el cociente mide ruido, no velocidad. Medido
#: contra una traza sintética sin ruido, el largo de un viaje pasaba de 3,47 km a
#: 9,78 km sólo por sumar el zigzag del GPS, y la velocidad media de 22 a 61
#: km/h. Una micro quedaba clasificada como un auto en la autopista y una
#: caminata como una micro.
#:
#: Veinte segundos dejan el error del GPS en unos 0,6 m/s, por debajo del paso
#: de una persona, que es el umbral más fino que hay que distinguir.
VENTANA_VELOCIDAD_S = 20.0

#: Un tramo más corto que esto no es un cambio de modo, es ruido: se absorbe en
#: el tramo vecino. Noventa segundos es menos que cualquier caminata útil hasta
#: un paradero y más que cualquier detención en un semáforo.
TRAMO_MINIMO_S = 90.0

#: Un salto de más de este tiempo sin puntos es un corte de grabación, no una
#: detención. Bajo tierra el GPS se pierde entero (el viaje en Metro de
#: `docs/10`), y eso hay que verlo como corte y no como una micro detenida
#: veinte minutos.
CORTE_S = 120.0


@dataclass(frozen=True)
class Tramo:
    tipo: Tipo
    desde: int          # índice del primer punto, inclusive
    hasta: int          # índice del último punto, inclusive
    duracion_s: float
    largo_m: float
    velocidad_media_ms: float

    @property
    def largo_puntos(self) -> int:
        return self.hasta - self.desde + 1


def velocidades(
    puntos: list[PuntoTraza], *, ventana_s: float = VENTANA_VELOCIDAD_S
) -> list[float]:
    """Velocidad en m/s, una por punto, medida sobre una ventana de tiempo.

    Sobre una **ventana** y no entre puntos vecinos: ver `VENTANA_VELOCIDAD_S`.
    Y sobre una ventana de *tiempo* y no de cantidad de puntos, porque las
    aplicaciones de registro bajan la frecuencia de muestreo cuando uno no se
    mueve.

    Se usa el desplazamiento **entre los extremos** de la ventana, no la suma
    del camino recorrido dentro: la suma acumula el ruido de cada muestra, que
    es justamente lo que hay que evitar.
    """
    n = len(puntos)
    if n < 2:
        return [0.0] * n
    salida = [0.0] * n
    i = j = 0
    for k in range(n):
        centro = puntos[k].t
        while (centro - puntos[i].t).total_seconds() > ventana_s / 2:
            i += 1
        j = max(j, k)
        while j + 1 < n and (puntos[j + 1].t - centro).total_seconds() <= ventana_s / 2:
            j += 1
        dt = (puntos[j].t - puntos[i].t).total_seconds()
        salida[k] = distancia_m(puntos[i].punto, puntos[j].punto) / dt if dt > 0 else 0.0
    return salida


def largo_recorrido(puntos: list[PuntoTraza], *, paso_s: float = 20.0) -> float:
    """Metros recorridos por la traza, sin contar el zigzag del GPS.

    `Traza.largo_m` suma punto a punto y sirve para describir el archivo; para
    medir **cuánto anduvo la persona** hay que remuestrear por tiempo primero,
    o el resultado sale inflado dos o tres veces (ver `VENTANA_VELOCIDAD_S`).
    """
    if len(puntos) < 2:
        return 0.0
    muestras = [puntos[0]]
    for p in puntos[1:]:
        if (p.t - muestras[-1].t).total_seconds() >= paso_s:
            muestras.append(p)
    if muestras[-1] is not puntos[-1]:
        muestras.append(puntos[-1])
    return sum(
        distancia_m(a.punto, b.punto) for a, b in zip(muestras, muestras[1:])
    )


def _suavizar(puntos: list[PuntoTraza], crudas: list[float]) -> list[float]:
    """Mediana móvil sobre una ventana de tiempo, no de cantidad de puntos.

    Las aplicaciones de registro no muestrean parejo: bajan la frecuencia
    cuando uno no se mueve. Una ventana de «los N puntos vecinos» abarcaría
    veinte segundos en movimiento y cinco minutos detenido.

    Mediana y no promedio porque el ruido del GPS produce saltos aislados
    enormes —un punto que aparece a cien metros— y un promedio los reparte
    sobre toda la ventana en lugar de ignorarlos.
    """
    n = len(puntos)
    salida = [0.0] * n
    i = j = 0
    for k in range(n):
        centro = puntos[k].t
        while (centro - puntos[i].t).total_seconds() > VENTANA_S / 2:
            i += 1
        j = max(j, k)
        while j + 1 < n and (puntos[j + 1].t - centro).total_seconds() <= VENTANA_S / 2:
            j += 1
        salida[k] = median(crudas[i : j + 1])
    return salida


def _clasificar(v: float) -> Tipo:
    if v < QUIETO_MS:
        return Tipo.DETENIDO
    if v < CAMINANDO_MS:
        return Tipo.CAMINANDO
    return Tipo.VEHICULO


def _armar(puntos: list[PuntoTraza], tipo: Tipo, desde: int, hasta: int) -> Tramo:
    dt = (puntos[hasta].t - puntos[desde].t).total_seconds()
    largo = largo_recorrido(puntos[desde : hasta + 1])
    return Tramo(
        tipo=tipo,
        desde=desde,
        hasta=hasta,
        duracion_s=dt,
        largo_m=largo,
        velocidad_media_ms=largo / dt if dt > 0 else 0.0,
    )


def segmentar(traza: Traza) -> list[Tramo]:
    """Parte la traza en tramos por modo de desplazamiento."""
    puntos = traza.puntos
    if len(puntos) < 3:
        return []

    # La ventana de velocidad ya quita casi todo el ruido; la mediana encima
    # limpia los saltos aislados que quedan.
    suaves = _suavizar(puntos, velocidades(puntos))
    etiquetas = [_clasificar(v) for v in suaves]

    # Un hueco en la grabación corta el tramo: lo que pasó en el medio no se
    # sabe, y unir los dos lados inventaría un trayecto que nadie registró.
    cortes = {
        i
        for i in range(1, len(puntos))
        if puntos[i].tras_corte
        or (puntos[i].t - puntos[i - 1].t).total_seconds() > CORTE_S
    }

    crudos: list[tuple[Tipo, int, int]] = []
    inicio = 0
    for i in range(1, len(puntos)):
        if etiquetas[i] != etiquetas[i - 1] or i in cortes:
            crudos.append((etiquetas[i - 1], inicio, i - 1))
            inicio = i
    crudos.append((etiquetas[-1], inicio, len(puntos) - 1))

    return _unir_cortos(puntos, crudos, cortes)


def _unir_cortos(
    puntos: list[PuntoTraza],
    crudos: list[tuple[Tipo, int, int]],
    cortes: set[int],
) -> list[Tramo]:
    """Absorbe los tramos demasiado breves para ser un cambio de modo real.

    Se recorre hasta que no quede ninguno: absorber un tramo puede dejar
    vecinos del mismo tipo que hay que fundir, y eso a su vez puede volver
    suficientemente largo a otro.
    """
    tramos = list(crudos)
    cambio = True
    while cambio and len(tramos) > 1:
        cambio = False
        for k, (tipo, desde, hasta) in enumerate(tramos):
            dt = (puntos[hasta].t - puntos[desde].t).total_seconds()
            if dt >= TRAMO_MINIMO_S:
                continue
            # Se absorbe hacia el vecino más largo, salvo que un corte de
            # grabación lo impida: al otro lado de un corte no se sabe nada.
            izq = tramos[k - 1] if k > 0 and desde not in cortes else None
            der = tramos[k + 1] if k + 1 < len(tramos) and hasta + 1 not in cortes else None
            if izq is None and der is None:
                continue
            elegido = izq if der is None else der if izq is None else (
                izq if (izq[2] - izq[1]) >= (der[2] - der[1]) else der
            )
            nuevo = (elegido[0], min(desde, elegido[1]), max(hasta, elegido[2]))
            otro = k - 1 if elegido is izq else k + 1
            for indice in sorted((k, otro), reverse=True):
                tramos.pop(indice)
            tramos.insert(min(k, otro), nuevo)
            cambio = True
            break

    # Fundir vecinos que quedaron del mismo tipo.
    fundidos: list[tuple[Tipo, int, int]] = []
    for tramo in tramos:
        if fundidos and fundidos[-1][0] == tramo[0] and tramo[1] not in cortes:
            tipo, desde, _ = fundidos[-1]
            fundidos[-1] = (tipo, desde, tramo[2])
        else:
            fundidos.append(tramo)

    return [_armar(puntos, tipo, desde, hasta) for tipo, desde, hasta in fundidos]


def tramos_a_bordo(tramos: list[Tramo]) -> list[Tramo]:
    """Los tramos que son candidatos a «iba arriba de algo»."""
    return [t for t in tramos if t.tipo is Tipo.VEHICULO]
