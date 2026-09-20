"""Trazas sintéticas, generadas del propio GTFS.

Sirven para una sola cosa, y conviene decir cuál **no** es: esto **no**
comprueba que el emparejamiento funcione en la calle. Comprueba que el
algoritmo hace lo que dice cuando la entrada es la que espera, que es el paso
previo. La prueba de verdad son las trazas grabadas a mano de `docs/10`, y
ninguna cantidad de simulación la reemplaza — entre otras cosas porque el ruido
real del GPS en la ciudad no es gaussiano: rebota en los edificios, se va en
bloque durante media cuadra y se recupera de golpe.

Lo que sí permite es tener el analizador terminado y probado **antes** de que
lleguen las trazas, en vez de empezar a escribirlo ese día.

Los tres casos que interesan son los de `docs/08` §1.1:

- `viaje_en_micro` — el caso base.
- `viaje_en_auto` — la misma calle sin detenerse en los paraderos. Es la
  prueba de que la señal de paradas sirve para algo.
- `viaje_en_metro` — el GPS se corta bajo tierra.
"""

from __future__ import annotations

import math
import random
from datetime import datetime, timedelta, timezone

from gtfs.geo import Punto, RADIO_TIERRA_M, distancia_m, punto_a_distancia
from .emparejar import Candidato
from .gpx import PuntoTraza, Traza

#: Velocidad de marcha de una micro entre paraderos, en m/s (≈ 22 km/h).
VELOCIDAD_MICRO_MS = 6.0
#: Lo que se demora una micro detenida en un paradero.
DETENCION_S = 18.0
#: Velocidad al caminar.
VELOCIDAD_CAMINANDO_MS = 1.3
#: Error típico del GPS de un teléfono en la calle, en metros.
RUIDO_M = 9.0

#: Cuánto se parece el error de un segundo al del anterior.
#:
#: El error del GPS urbano **no** es ruido blanco: lo domina el rebote de la
#: señal en los edificios, que se mantiene mientras uno va por la misma cuadra
#: y cambia de golpe al doblar. Simularlo como independiente en cada muestra
#: daría un zigzag que en la calle no existe, y haría ver el algoritmo peor —o
#: mejor— de lo que es por la razón equivocada.
PERSISTENCIA_RUIDO = 0.92


def _desplazar(punto: Punto, dx_m: float, dy_m: float) -> Punto:
    """Corre un punto unos metros en el plano local."""
    lat, lon = punto
    dlat = math.degrees(dy_m / RADIO_TIERRA_M)
    dlon = math.degrees(dx_m / (RADIO_TIERRA_M * math.cos(math.radians(lat))))
    return (lat + dlat, lon + dlon)


class _Ruido:
    """Error de GPS que se arrastra de una muestra a la siguiente."""

    def __init__(self, ruido_m: float, azar: random.Random):
        self.ruido_m = ruido_m
        self.azar = azar
        # La varianza de estado estacionario de un AR(1) es σ²/(1−a²); se
        # escala el término nuevo para que la desviación total sea `ruido_m`.
        self.escala = ruido_m * math.sqrt(1 - PERSISTENCIA_RUIDO**2)
        self.ex = azar.gauss(0, ruido_m)
        self.ey = azar.gauss(0, ruido_m)

    def aplicar(self, punto: Punto) -> Punto:
        if self.ruido_m <= 0:
            return punto
        self.ex = PERSISTENCIA_RUIDO * self.ex + self.azar.gauss(0, self.escala)
        self.ey = PERSISTENCIA_RUIDO * self.ey + self.azar.gauss(0, self.escala)
        return _desplazar(punto, self.ex, self.ey)


def _caminata(
    desde: Punto, hasta: Punto, inicio: datetime, ruido: _Ruido
) -> list[PuntoTraza]:
    """Puntos a 1 Hz caminando de un lugar a otro."""
    metros = distancia_m(desde, hasta)
    segundos = max(1, int(metros / VELOCIDAD_CAMINANDO_MS))
    salida = []
    for s in range(segundos + 1):
        t = s / segundos
        crudo = (
            desde[0] + t * (hasta[0] - desde[0]),
            desde[1] + t * (hasta[1] - desde[1]),
        )
        salida.append(
            PuntoTraza(*ruido.aplicar(crudo), t=inicio + timedelta(seconds=s))
        )
    return salida


def _recorrer(
    candidato: Candidato,
    desde_m: float,
    hasta_m: float,
    inicio: datetime,
    *,
    velocidad_ms: float,
    detenciones: list[float],
    detencion_s: float,
    ruido: _Ruido,
    azar: random.Random,
) -> list[PuntoTraza]:
    """Avanza por el trazado a 1 Hz, deteniéndose donde se le indique."""
    salida: list[PuntoTraza] = []
    s = desde_m
    t = inicio
    pendientes = sorted(d for d in detenciones if desde_m <= d <= hasta_m)

    while s < hasta_m:
        salida.append(
            PuntoTraza(*ruido.aplicar(punto_a_distancia(candidato.trazado, s)), t=t)
        )
        t += timedelta(seconds=1)
        paso = velocidad_ms * azar.uniform(0.75, 1.25)
        s_siguiente = s + paso

        # Las paradas que ya quedaron atrás se descartan. Sin esto, una parada
        # que coincide con el punto de partida se queda para siempre a la cabeza
        # de la lista —`s` nunca vuelve a ser menor que ella— y bloquea todas las
        # demás: el viaje simulado no se detenía en ningún paradero.
        while pendientes and pendientes[0] <= s:
            pendientes.pop(0)

        if pendientes and pendientes[0] <= s_siguiente:
            parada = pendientes.pop(0)
            punto = punto_a_distancia(candidato.trazado, parada)
            for _ in range(int(detencion_s)):
                salida.append(PuntoTraza(*ruido.aplicar(punto), t=t))
                t += timedelta(seconds=1)
            s_siguiente = parada
        s = s_siguiente
    return salida


def _distancias_de_paradas(candidato: Candidato) -> list[float]:
    return sorted(candidato.indice.proyectar(p)[0] for p in candidato.paradas)


def viaje_en_micro(
    candidato: Candidato,
    *,
    paraderos: int = 8,
    desde_paradero: int = 2,
    ruido_m: float = RUIDO_M,
    con_caminatas: bool = True,
    semilla: int = 0,
) -> Traza:
    """Un viaje en micro completo: caminar, subirse, viajar, bajarse, caminar."""
    azar = random.Random(semilla)
    ruido = _Ruido(ruido_m, azar)
    paradas_s = _distancias_de_paradas(candidato)
    if len(paradas_s) < desde_paradero + paraderos + 1:
        paraderos = max(2, len(paradas_s) - desde_paradero - 1)
    subida = paradas_s[desde_paradero]
    bajada = paradas_s[desde_paradero + paraderos]

    t0 = datetime(2026, 9, 22, 8, 30, tzinfo=timezone.utc)
    puntos: list[PuntoTraza] = []

    punto_subida = punto_a_distancia(candidato.trazado, subida)
    if con_caminatas:
        origen = _desplazar(punto_subida, azar.uniform(-180, 180), azar.uniform(-180, 180))
        puntos += _caminata(origen, punto_subida, t0, ruido)
        t0 = puntos[-1].t + timedelta(seconds=20)

    puntos += _recorrer(
        candidato, subida, bajada, t0,
        velocidad_ms=VELOCIDAD_MICRO_MS,
        detenciones=paradas_s,
        detencion_s=DETENCION_S,
        ruido=ruido,
        azar=azar,
    )

    if con_caminatas:
        punto_bajada = punto_a_distancia(candidato.trazado, bajada)
        destino = _desplazar(punto_bajada, azar.uniform(-180, 180), azar.uniform(-180, 180))
        puntos += _caminata(
            punto_bajada, destino, puntos[-1].t + timedelta(seconds=15), ruido
        )

    return Traza(nombre=f"micro-{candidato.id}", puntos=puntos)


def viaje_en_auto(
    candidato: Candidato,
    *,
    paraderos: int = 8,
    desde_paradero: int = 2,
    ruido_m: float = RUIDO_M,
    semilla: int = 1,
) -> Traza:
    """El mismo trayecto en auto: más rápido y **sin parar en los paraderos**.

    Es el contraejemplo que da sentido a la señal de paradas. Si el emparejador
    le da a esto la misma confianza que a la micro, la telemetría va a tomar por
    buses a todos los autos de Santiago.
    """
    azar = random.Random(semilla)
    ruido = _Ruido(ruido_m, azar)
    paradas_s = _distancias_de_paradas(candidato)
    if len(paradas_s) < desde_paradero + paraderos + 1:
        paraderos = max(2, len(paradas_s) - desde_paradero - 1)
    puntos = _recorrer(
        candidato,
        paradas_s[desde_paradero],
        paradas_s[desde_paradero + paraderos],
        datetime(2026, 9, 22, 8, 30, tzinfo=timezone.utc),
        velocidad_ms=VELOCIDAD_MICRO_MS * 1.6,
        # Un auto sí para: en los semáforos, que no coinciden con los paraderos.
        detenciones=[s + 130.0 for s in paradas_s[::3]],
        detencion_s=12.0,
        ruido=ruido,
        azar=azar,
    )
    return Traza(nombre=f"auto-{candidato.id}", puntos=puntos)


def viaje_en_metro(
    candidato: Candidato,
    *,
    paraderos: int = 5,
    desde_paradero: int = 1,
    semilla: int = 2,
) -> Traza:
    """Un viaje bajo tierra: se graba la entrada, se pierde la señal, se recupera.

    Confirma lo que `docs/08` §1.1 quiere comprobar: que el GPS se corta. Para
    el emparejador es el caso en que la respuesta correcta es **no sé**, y lo
    que se prueba es que lo diga en lugar de inventar un recorrido de
    superficie que pase por arriba.
    """
    azar = random.Random(semilla)
    ruido = _Ruido(RUIDO_M, azar)
    paradas_s = _distancias_de_paradas(candidato)
    if len(paradas_s) < desde_paradero + paraderos + 1:
        paraderos = max(2, len(paradas_s) - desde_paradero - 1)
    entrada = punto_a_distancia(candidato.trazado, paradas_s[desde_paradero])
    salida_ = punto_a_distancia(candidato.trazado, paradas_s[desde_paradero + paraderos])

    t0 = datetime(2026, 9, 22, 8, 30, tzinfo=timezone.utc)
    puntos = _caminata(_desplazar(entrada, 120, 40), entrada, t0, ruido)
    # Bajo tierra no hay nada. El siguiente punto aparece al salir, minutos
    # después y a varias estaciones de distancia.
    reaparece = puntos[-1].t + timedelta(minutes=9)
    puntos.append(PuntoTraza(*ruido.aplicar(salida_), t=reaparece, tras_corte=True))
    puntos += _caminata(
        salida_, _desplazar(salida_, -110, 70), reaparece + timedelta(seconds=1), ruido
    )
    return Traza(nombre=f"metro-{candidato.id}", puntos=puntos)


def a_gpx(traza: Traza) -> str:
    """Escribe la traza como GPX, para poder abrirla en cualquier visor."""
    def fila(p: PuntoTraza) -> str:
        # Un corte de grabación se escribe como lo escriben las aplicaciones
        # reales: cerrando el segmento y abriendo otro.
        corte = "    </trkseg>\n    <trkseg>\n" if p.tras_corte else ""
        return (
            f'{corte}      <trkpt lat="{p.lat:.6f}" lon="{p.lon:.6f}">'
            f'<time>{p.t.strftime("%Y-%m-%dT%H:%M:%SZ")}</time></trkpt>'
        )

    filas = "\n".join(fila(p) for p in traza.puntos)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<gpx version="1.1" creator="Kupay" '
        'xmlns="http://www.topografix.com/GPX/1/1">\n'
        f"  <trk><name>{traza.nombre}</name>\n    <trkseg>\n{filas}\n"
        "    </trkseg>\n  </trk>\n</gpx>\n"
    )
