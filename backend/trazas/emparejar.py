"""¿En qué recorrido iba esta traza?

Es la pregunta de la que depende el producto entero (`docs/06` R2b). La
respuesta no puede ser sólo «la traza pasa cerca de este trazado», porque en
Alameda pasan cerca cuarenta recorridos y un auto por la misma calle pasa igual
de cerca que la micro. Hacen falta tres señales, y la tercera es la que
distingue de verdad:

1. **Cobertura** — qué parte de la traza cae sobre el trazado. Descarta lo que
   no tiene nada que ver, y nada más: en un corredor la comparten todos.
2. **Avance** — cuánto progresó la traza *a lo largo* del trazado, sin
   retroceder. Un auto que cruza la avenida toca el trazado un instante y no
   avanza por él; una micro lo recorre entero. Distingue al que va **por** el
   recorrido del que sólo lo **toca**.
3. **Paradas** — en cuántos paraderos del recorrido la traza efectivamente se
   detuvo. Ésta es la que separa la micro del auto que va por la misma calle a
   la misma hora: el auto no para en los paraderos. Es la señal más cara de
   falsear y la más informativa.

Lo que el método **no** puede resolver solo es la ambigüedad entre dos
recorridos que comparten todo el tramo grabado. Para eso está `margen`: cuando
dos candidatos empatan, el resultado lo dice en vez de elegir uno al azar. Un
empate declarado es información; un empate escondido es un ETA equivocado.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from gtfs.geo import Punto, a_plano, distancia_m, distancias_acumuladas
from gtfs.parse import Feed
from .gpx import PuntoTraza, Traza
from .segmentar import Tipo, Tramo, largo_recorrido, segmentar, velocidades

#: Hasta dónde se considera que un punto «cae sobre» el trazado. El GPS de un
#: teléfono en la calle tiene un error de 5 a 20 m, y el trazado del GTFS va por
#: el eje de la calzada mientras el bus va por la pista derecha. Treinta y cinco
#: metros cubre las dos cosas sin tragarse la calle paralela.
TOLERANCIA_M = 35.0

#: Radio alrededor de un paradero dentro del cual se mide la permanencia.
RADIO_PARADERO_M = 40.0

#: Cuánto tiempo hay que quedarse dentro de ese radio para que cuente como
#: «paró aquí».
#:
#: Se mide **permanencia y no velocidad**, y la diferencia importa: una
#: velocidad baja puntual la produce el ruido del GPS, un semáforo o un tapón,
#: mientras que estar doce segundos dentro de cuarenta metros de un paradero
#: sólo pasa si el vehículo se detuvo ahí. Un auto a 35 km/h cruza esos ochenta
#: metros en siete segundos; una micro que abre las puertas se queda veinticinco
#: o más. Ése es todo el margen, y es suficiente.
PERMANENCIA_MINIMA_S = 12.0

#: Lado de la celda del índice de segmentos, en metros.
CELDA_M = 120.0

#: Lado de la celda del índice global de recorridos, en grados (~450 m).
CELDA_GRADOS = 0.004

#: Cuántos candidatos pasan del prefiltro a la evaluación completa.
CANDIDATOS_MAXIMOS = 60

#: Pesos de las tres señales. El avance pesa más que la cobertura porque es lo
#: que separa «va por el recorrido» de «lo cruza», que es el error que de
#: verdad importa; las paradas pesan menos sólo porque un viaje corto puede
#: tener muy pocas y no conviene que un tramo de tres paraderos decida solo.
PESO_COBERTURA = 0.35
PESO_AVANCE = 0.40
PESO_PARADAS = 0.25

#: Por debajo de esta puntuación no se afirma nada.
PUNTAJE_MINIMO = 0.55

#: Si el primero no le saca al segundo al menos esto, es un empate y se dice.
MARGEN_MINIMO = 0.08

#: Con al menos estos paraderos en el tramo, la proporción de detenciones ya es
#: una señal utilizable. Con uno o dos, no dice nada.
PARADAS_SUFICIENTES = 3

#: Por debajo de esta proporción, lo grabado recorrió el trazado **sin
#: detenerse donde se detiene una micro**, y entonces no iba en micro.
#:
#: Es la regla que impide que la telemetría tome por buses a los autos de
#: Santiago. Sin ella, un auto por la misma avenida saca cobertura 1,00 y avance
#: 1,00 —mejor que la micro, porque no se detiene— y entraría al sistema con
#: más confianza que el dato bueno. Medido contra trazas sintéticas: la micro
#: para en 7 de 9 paraderos, el auto en 0 de 9.
UMBRAL_PARADAS = 0.35


# --------------------------------------------------------------------------- #
# Trazado indexado
# --------------------------------------------------------------------------- #

class TrazadoIndexado:
    """Un trazado preparado para proyectar muchos puntos rápido.

    `geo.proyectar` recorre todos los segmentos en cada llamada y reconstruye
    la proyección plana del trazado entera cada vez. Para el motor —un punto,
    un trazado conocido— está bien. Acá hay que cruzar mil puntos contra
    sesenta trazados de dos mil vértices: son ciento veinte millones de
    operaciones por traza, y el análisis no termina nunca.

    Con una grilla de celdas de 120 m, cada punto sólo se compara contra los
    segmentos que pasan por su celda y las ocho vecinas.
    """

    def __init__(self, trazado: list[Punto]):
        if len(trazado) < 2:
            raise ValueError("El trazado necesita al menos dos puntos")
        self.trazado = trazado
        self.lat_ref = trazado[0][0]
        self.plano = [a_plano(lat, lon, self.lat_ref) for lat, lon in trazado]
        self.acum = distancias_acumuladas(trazado)
        self.largo = self.acum[-1]

        self.celdas: dict[tuple[int, int], list[int]] = {}
        for i, ((ax, ay), (bx, by)) in enumerate(zip(self.plano, self.plano[1:])):
            largo = math.hypot(bx - ax, by - ay)
            pasos = max(1, int(largo / (CELDA_M / 2)) + 1)
            for k in range(pasos + 1):
                t = k / pasos
                x, y = ax + t * (bx - ax), ay + t * (by - ay)
                llave = (int(x // CELDA_M), int(y // CELDA_M))
                lista = self.celdas.setdefault(llave, [])
                if not lista or lista[-1] != i:
                    lista.append(i)

    def proyectar(self, punto: Punto, desde_m: float = 0.0) -> tuple[float, float]:
        """Devuelve (distancia recorrida, desviación) del punto sobre el trazado.

        ``desde_m`` descarta los segmentos que quedan atrás, que es como se
        impone que el avance sea monótono sin tener que recorrer el trazado dos
        veces.
        """
        px, py = a_plano(punto[0], punto[1], self.lat_ref)
        ci, cj = int(px // CELDA_M), int(py // CELDA_M)
        mejor = (0.0, math.inf)
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for i in self.celdas.get((ci + di, cj + dj), ()):
                    if self.acum[i + 1] < desde_m:
                        continue
                    ax, ay = self.plano[i]
                    bx, by = self.plano[i + 1]
                    dx, dy = bx - ax, by - ay
                    largo2 = dx * dx + dy * dy
                    t = 0.0 if largo2 == 0 else ((px - ax) * dx + (py - ay) * dy) / largo2
                    t = max(0.0, min(1.0, t))
                    qx, qy = ax + t * dx, ay + t * dy
                    desviacion = math.hypot(px - qx, py - qy)
                    if desviacion < mejor[1]:
                        s = self.acum[i] + t * (self.acum[i + 1] - self.acum[i])
                        mejor = (s, desviacion)
        return mejor


# --------------------------------------------------------------------------- #
# Los recorridos contra los que se compara
# --------------------------------------------------------------------------- #

@dataclass
class Candidato:
    """Un recorrido y sentido, con su trazado y sus paraderos."""

    id: str             # «506-0»
    recorrido_id: str
    nombre: str         # «506»
    sentido: int | None
    letrero: str
    trazado: list[Punto]
    paradas: list[Punto]
    indice: TrazadoIndexado = field(repr=False, default=None)  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.indice is None:
            self.indice = TrazadoIndexado(self.trazado)


def candidatos_del_feed(feed: Feed) -> list[Candidato]:
    """Un candidato por recorrido **y sentido**.

    Por sentido y no por recorrido: la ida y la vuelta de una línea son dos
    trazados distintos que comparten calle en muy pocos tramos, y confundirlos
    es decir que el bus va justo para el lado contrario. Es el mismo error que
    ya se había cometido al exportar la red para la app.

    De cada par se toma el viaje con más paradas, que es el que recorre la
    línea completa: los feeds traen viajes cortados por obras o por horario.
    """
    mejor: dict[tuple[str, int | None], tuple[int, str]] = {}
    for viaje in feed.viajes.values():
        if not viaje.trazado_id or viaje.trazado_id not in feed.trazados:
            continue
        cuantas = len(feed.pasos_por_viaje(viaje.id))
        llave = (viaje.recorrido_id, viaje.sentido)
        if llave not in mejor or cuantas > mejor[llave][0]:
            mejor[llave] = (cuantas, viaje.id)

    salida: list[Candidato] = []
    for (recorrido_id, sentido), (_, viaje_id) in mejor.items():
        viaje = feed.viajes[viaje_id]
        trazado = feed.trazados[viaje.trazado_id]  # type: ignore[index]
        if len(trazado) < 2:
            continue
        recorrido = feed.recorridos.get(recorrido_id)
        paradas = [
            feed.paradas[p.parada_id].punto
            for p in feed.pasos_por_viaje(viaje_id)
            if p.parada_id in feed.paradas
        ]
        salida.append(
            Candidato(
                id=f"{recorrido_id}-{sentido}" if sentido is not None else recorrido_id,
                recorrido_id=recorrido_id,
                nombre=recorrido.nombre_corto if recorrido else recorrido_id,
                sentido=sentido,
                letrero=viaje.letrero,
                trazado=trazado,
                paradas=paradas,
            )
        )
    return salida


class IndiceGlobal:
    """Grilla gruesa sobre todos los candidatos, para el prefiltro.

    Evaluar en serio los ochocientos y tantos candidatos de la red contra cada
    traza es trabajo tirado: la inmensa mayoría pasa por otra comuna. Esta
    grilla deja en pie sólo los que comparten territorio con la traza.
    """

    def __init__(self, candidatos: list[Candidato]):
        self.candidatos = candidatos
        self.celdas: dict[tuple[int, int], set[int]] = {}
        for k, cand in enumerate(candidatos):
            for lat, lon in cand.trazado:
                llave = (int(lat / CELDA_GRADOS), int(lon / CELDA_GRADOS))
                self.celdas.setdefault(llave, set()).add(k)

    def cerca_de(self, puntos: list[Punto]) -> list[Candidato]:
        """Candidatos ordenados por cuántas muestras de la traza tienen cerca."""
        cuenta: dict[int, int] = {}
        for lat, lon in puntos:
            i, j = int(lat / CELDA_GRADOS), int(lon / CELDA_GRADOS)
            vistos: set[int] = set()
            for di in (-1, 0, 1):
                for dj in (-1, 0, 1):
                    vistos |= self.celdas.get((i + di, j + dj), set())
            for k in vistos:
                cuenta[k] = cuenta.get(k, 0) + 1
        orden = sorted(cuenta.items(), key=lambda kv: -kv[1])
        return [self.candidatos[k] for k, _ in orden[:CANDIDATOS_MAXIMOS]]


# --------------------------------------------------------------------------- #
# Puntuación
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Puntaje:
    candidato: Candidato
    cobertura: float     # 0–1: puntos de la traza sobre el trazado
    avance: float        # 0–1: cuánto progresó a lo largo del trazado
    paradas: float       # 0–1: concordancia entre detenciones y paraderos
    paradas_vistas: int
    paradas_posibles: int
    detenciones_observadas: int
    desviacion_mediana: float

    @property
    def total(self) -> float:
        return (
            PESO_COBERTURA * self.cobertura
            + PESO_AVANCE * self.avance
            + PESO_PARADAS * self.paradas
        )

    @property
    def no_se_detuvo(self) -> bool:
        """Recorrió el trazado sin parar en los paraderos: no iba en micro.

        Un auto particular por la misma calle. Se mira aparte del puntaje
        porque **no es un empate ni una duda**: es un descarte, y confundirlo
        con «poca confianza» haría que el dato entrara igual, sólo que marcado.
        """
        return (
            self.paradas_posibles >= PARADAS_SUFICIENTES
            and self.paradas < UMBRAL_PARADAS
        )


def puntuar(
    puntos: list[PuntoTraza], candidato: Candidato, *, vel: list[float] | None = None
) -> Puntaje:
    """Evalúa una traza contra un recorrido."""
    indice = candidato.indice
    if vel is None:
        vel = velocidades(puntos)

    desviaciones: list[float] = []
    esa: list[float] = []          # distancia recorrida de cada punto
    avance_minimo = 0.0
    dentro = 0
    for p in puntos:
        s, d = indice.proyectar(p.punto, desde_m=avance_minimo)
        if d is math.inf:
            desviaciones.append(math.inf)
            esa.append(avance_minimo)
            continue
        desviaciones.append(d)
        esa.append(s)
        if d <= TOLERANCIA_M:
            dentro += 1
            avance_minimo = max(avance_minimo, s)

    cobertura = dentro / len(puntos) if puntos else 0.0

    # Avance: cuánto se recorrió del trazado frente a cuánto anduvo la traza.
    # Se compara contra el largo de la **traza** y no contra el del trazado
    # porque un viaje de cinco paraderos en una línea de treinta kilómetros es
    # un emparejamiento perfecto, no uno del 15%.
    sobre_trazado = [s for s, d in zip(esa, desviaciones) if d <= TOLERANCIA_M]
    recorrido_m = max(sobre_trazado) - min(sobre_trazado) if len(sobre_trazado) > 1 else 0.0
    # Remuestreado por tiempo: sumar punto a punto acumula el zigzag del GPS e
    # infla el largo de la traza dos o tres veces, lo que hundiría el avance de
    # un emparejamiento perfecto (ver `segmentar.VENTANA_VELOCIDAD_S`).
    largo_traza = largo_recorrido(puntos)
    avance = min(1.0, recorrido_m / largo_traza) if largo_traza > 20 else 0.0

    vistas, posibles, observadas = _paradas_respetadas(puntos, candidato, sobre_trazado)
    # Media armónica entre «paró en los paraderos del recorrido» y «el recorrido
    # explica las detenciones». Armónica y no promedio: basta que una de las dos
    # sea mala para que la respuesta sea mala, y el promedio deja pasar el caso
    # de la variante expresa, que acierta todos sus paraderos y no explica nada
    # de lo demás.
    recuerdo = vistas / posibles if posibles else 0.0
    precision = vistas / observadas if observadas else 0.0
    proporcion = (
        2 * recuerdo * precision / (recuerdo + precision)
        if recuerdo + precision > 0
        else 0.0
    )

    finitas = [d for d in desviaciones if d != math.inf]
    mediana = sorted(finitas)[len(finitas) // 2] if finitas else math.inf

    return Puntaje(
        candidato=candidato,
        cobertura=cobertura,
        avance=avance,
        paradas=proporcion,
        paradas_vistas=vistas,
        paradas_posibles=posibles,
        detenciones_observadas=observadas,
        desviacion_mediana=mediana,
    )


def detenciones(puntos: list[PuntoTraza]) -> list[Punto]:
    """Los lugares donde la traza se quedó quieta el tiempo suficiente.

    Se agrupan los puntos consecutivos que caben dentro de un mismo radio y se
    conserva el grupo si duró lo bastante. El resultado es el centro de cada
    detención, que es lo que se compara después contra los paraderos.
    """
    salida: list[Punto] = []
    n = len(puntos)
    i = 0
    while i < n:
        j = i
        while (
            j + 1 < n
            and distancia_m(puntos[i].punto, puntos[j + 1].punto) <= RADIO_PARADERO_M
        ):
            j += 1
        if (puntos[j].t - puntos[i].t).total_seconds() >= PERMANENCIA_MINIMA_S:
            grupo = puntos[i : j + 1]
            salida.append(
                (
                    sum(p.lat for p in grupo) / len(grupo),
                    sum(p.lon for p in grupo) / len(grupo),
                )
            )
            i = j + 1
        else:
            i += 1
    return salida


def _paradas_respetadas(
    puntos: list[PuntoTraza],
    candidato: Candidato,
    sobre_trazado: list[float],
) -> tuple[int, int, int]:
    """Compara las detenciones de la traza con los paraderos del recorrido.

    Devuelve (aciertos, paraderos del tramo, detenciones observadas).

    **Se miran las dos direcciones, y eso no es un refinamiento.** Contar sólo
    «en cuántos de sus paraderos paró» premia a los recorridos con menos
    paraderos: medido contra el feed real, la variante expresa 506e le ganaba
    siempre a la 506 en un viaje generado sobre la 506, porque parar en sus 5
    paraderos es más fácil que parar en 18. Mirando además cuántas de las
    detenciones observadas **explica** el recorrido, la expresa pierde: deja
    trece detenciones sin explicar.

    Sólo entran los paraderos **del tramo que la traza recorrió**: exigirle a un
    viaje de diez cuadras que pare en los sesenta paraderos de la línea sería
    castigarlo por no haber viajado más.
    """
    paradas_traza = detenciones(puntos)
    if not sobre_trazado or not candidato.paradas or not paradas_traza:
        return 0, 0, len(paradas_traza)
    desde, hasta = min(sobre_trazado), max(sobre_trazado)

    del_tramo = []
    for parada in candidato.paradas:
        s, d = candidato.indice.proyectar(parada)
        if d <= 120.0 and desde - 50.0 <= s <= hasta + 50.0:
            del_tramo.append(parada)

    aciertos = sum(
        1
        for parada in del_tramo
        if any(distancia_m(parada, q) <= RADIO_PARADERO_M for q in paradas_traza)
    )
    return aciertos, len(del_tramo), len(paradas_traza)


# --------------------------------------------------------------------------- #
# Resultado
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Resultado:
    tramo: Tramo | None
    puntajes: list[Puntaje]        # ordenados de mejor a peor

    @property
    def mejor(self) -> Puntaje | None:
        return self.puntajes[0] if self.puntajes else None

    @property
    def margen(self) -> float:
        if len(self.puntajes) < 2:
            return 1.0
        return self.puntajes[0].total - self.puntajes[1].total

    @property
    def concluyente(self) -> bool:
        """True sólo si hay un ganador claro. Un empate no es una respuesta."""
        m = self.mejor
        return bool(
            m
            and m.total >= PUNTAJE_MINIMO
            and self.margen >= MARGEN_MINIMO
            and not m.no_se_detuvo
        )

    def explicacion(self) -> str:
        m = self.mejor
        if m is None:
            return "Sin candidatos: la traza no pasa cerca de ningún recorrido."
        if m.total < PUNTAJE_MINIMO:
            return (
                f"Ningún recorrido alcanza el mínimo "
                f"(el mejor, {m.candidato.nombre}, saca {m.total:.2f})."
            )
        if m.no_se_detuvo:
            return (
                f"Recorrió {m.candidato.nombre} sin detenerse en sus paraderos "
                f"({m.paradas_vistas} de {m.paradas_posibles}): no iba en micro."
            )
        if self.margen < MARGEN_MINIMO:
            segundo = self.puntajes[1]
            return (
                f"Empate entre {m.candidato.nombre} ({m.total:.2f}) y "
                f"{segundo.candidato.nombre} ({segundo.total:.2f}): "
                f"comparten el tramo grabado."
            )
        return (
            f"{m.candidato.nombre} → {m.candidato.letrero} "
            f"({m.total:.2f}, {self.margen:+.2f} sobre el siguiente)"
        )


def emparejar(
    traza: Traza, indice: IndiceGlobal, *, tramo: Tramo | None = None
) -> Resultado:
    """Empareja una traza —o uno de sus tramos— con un recorrido."""
    puntos = traza.puntos if tramo is None else traza.puntos[tramo.desde : tramo.hasta + 1]
    if len(puntos) < 5:
        return Resultado(tramo=tramo, puntajes=[])

    muestras = [p.punto for p in puntos[:: max(1, len(puntos) // 200)]]
    cercanos = indice.cerca_de(muestras)
    if not cercanos:
        return Resultado(tramo=tramo, puntajes=[])

    vel = velocidades(puntos)
    puntajes = [puntuar(puntos, c, vel=vel) for c in cercanos]
    puntajes.sort(key=lambda p: -p.total)
    return Resultado(tramo=tramo, puntajes=puntajes)


def analizar(traza: Traza, indice: IndiceGlobal) -> list[Resultado]:
    """Segmenta la traza y empareja cada tramo a bordo de un vehículo."""
    tramos = segmentar(traza)
    a_bordo = [t for t in tramos if t.tipo is Tipo.VEHICULO]
    if not a_bordo:
        return []
    return [emparejar(traza, indice, tramo=t) for t in a_bordo]
