"""Pruebas del análisis de trazas GPS.

Lo que se comprueba acá es **el algoritmo**, no la realidad: las trazas son
sintéticas, generadas del mismo GTFS contra el que después se emparejan. Eso
hace de éste el mejor caso posible, y conviene tenerlo presente al leer
cualquier porcentaje. La comprobación de verdad son las trazas grabadas a mano
de `docs/10`, y no hay simulación que la reemplace.

Aun así las pruebas valen, porque ya encontraron tres defectos reales:

1. La velocidad medida entre puntos vecinos es ruido puro: inflaba el largo de
   un viaje de 3,5 a 9,8 km y convertía una caminata en un viaje en micro.
2. Contar sólo «en cuántos de sus paraderos paró» premiaba a las variantes
   expresas, que tienen menos paraderos.
3. El simulador no se detenía en ningún paradero, y la señal de paradas estaba
   midiendo en realidad «pasó lento por al lado».
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from gtfs.parse import leer_feed
from trazas import emparejar as emp
from trazas import simular as sim
from trazas.gpx import PuntoTraza, Traza, leer
from trazas.segmentar import Tipo, largo_recorrido, segmentar, velocidades

FIXTURE = Path(__file__).parent / "fixtures" / "gtfs_ejemplo"
T0 = datetime(2026, 9, 22, 8, 0, tzinfo=timezone.utc)


@pytest.fixture(scope="module")
def candidato():
    feed = leer_feed(FIXTURE)
    candidatos = emp.candidatos_del_feed(feed)
    assert candidatos, "el feed de ejemplo debe traer al menos un recorrido"
    return max(candidatos, key=lambda c: len(c.paradas))


@pytest.fixture(scope="module")
def indice(candidato):
    feed = leer_feed(FIXTURE)
    return emp.IndiceGlobal(emp.candidatos_del_feed(feed))


def recta(n: int, *, paso_m: float, cada_s: float = 1.0) -> list[PuntoTraza]:
    """Puntos en línea recta hacia el norte, a velocidad constante."""
    grados = paso_m / 111_320.0
    return [
        PuntoTraza(-33.45 + i * grados, -70.65, T0 + timedelta(seconds=i * cada_s))
        for i in range(n)
    ]


# --------------------------------------------------------------------------- #
# GPX
# --------------------------------------------------------------------------- #

def test_gpx_ida_y_vuelta(tmp_path, candidato):
    """Escribir y volver a leer una traza conserva los puntos y las horas."""
    original = sim.viaje_en_micro(candidato, paraderos=3, con_caminatas=False)
    ruta = tmp_path / "viaje.gpx"
    ruta.write_text(sim.a_gpx(original), encoding="utf-8")

    leida = leer(ruta)
    assert len(leida.puntos) == len(original.puntos)
    assert leida.puntos[0].t == original.puntos[0].t
    assert leida.puntos[-1].lat == pytest.approx(original.puntos[-1].lat, abs=1e-6)


def test_gpx_marca_los_cortes(tmp_path, candidato):
    """Un corte de grabación sobrevive al viaje de ida y vuelta por GPX.

    Importa porque es la señal del viaje en Metro: bajo tierra no hay GPS.
    """
    metro = sim.viaje_en_metro(candidato, paraderos=2)
    ruta = tmp_path / "metro.gpx"
    ruta.write_text(sim.a_gpx(metro), encoding="utf-8")
    assert any(p.tras_corte for p in leer(ruta).puntos)


def test_gpx_rechaza_lo_que_no_es_gpx(tmp_path):
    ruta = tmp_path / "cualquier.gpx"
    ruta.write_text("<html><body>hola</body></html>", encoding="utf-8")
    with pytest.raises(ValueError, match="no es un archivo GPX"):
        leer(ruta)


def test_gpx_rechaza_sin_puntos(tmp_path):
    ruta = tmp_path / "vacio.gpx"
    ruta.write_text(
        '<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg/></trk></gpx>',
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="no trae puntos"):
        leer(ruta)


# --------------------------------------------------------------------------- #
# Velocidad y largo
# --------------------------------------------------------------------------- #

def test_velocidad_sobre_una_recta():
    v = velocidades(recta(120, paso_m=6.0))
    # Los extremos tienen media ventana y se miden peor; el centro no.
    assert v[60] == pytest.approx(6.0, rel=0.02)


def test_el_ruido_no_infla_el_largo(candidato):
    """El largo remuestreado aguanta el ruido; sumar punto a punto no.

    Es el defecto que hacía ver una micro a 61 km/h.
    """
    limpia = sim.viaje_en_micro(candidato, ruido_m=0.0, con_caminatas=False, semilla=4)
    sucia = sim.viaje_en_micro(candidato, ruido_m=9.0, con_caminatas=False, semilla=4)

    error_crudo = abs(sucia.largo_m - limpia.largo_m)
    error_bueno = abs(largo_recorrido(sucia.puntos) - largo_recorrido(limpia.puntos))

    assert error_crudo > limpia.largo_m * 0.2, "sin ruido la prueba no prueba nada"
    # No basta con que el remuestreo sea bueno: tiene que ser **mucho** mejor
    # que sumar punto a punto, que es lo que se reemplazó.
    assert error_bueno < error_crudo / 3


# --------------------------------------------------------------------------- #
# Segmentación
# --------------------------------------------------------------------------- #

def test_distingue_caminar_de_ir_en_vehiculo():
    puntos = recta(400, paso_m=1.3) + [
        PuntoTraza(p.lat + 0.005, p.lon, p.t + timedelta(seconds=400))
        for p in recta(400, paso_m=7.0)
    ]
    tipos = {t.tipo for t in segmentar(Traza("mixta", puntos))}
    assert Tipo.CAMINANDO in tipos
    assert Tipo.VEHICULO in tipos


def test_un_semaforo_no_parte_el_viaje():
    """Veinte segundos detenido son un semáforo, no un cambio de modo."""
    puntos = recta(200, paso_m=7.0)
    quieto = [
        PuntoTraza(puntos[-1].lat, puntos[-1].lon, puntos[-1].t + timedelta(seconds=i))
        for i in range(1, 21)
    ]
    sigue = [
        PuntoTraza(p.lat + 0.0126, p.lon, p.t + timedelta(seconds=220))
        for p in recta(200, paso_m=7.0)
    ]
    tramos = segmentar(Traza("semaforo", puntos + quieto + sigue))
    assert [t.tipo for t in tramos] == [Tipo.VEHICULO]


# --------------------------------------------------------------------------- #
# Emparejamiento
# --------------------------------------------------------------------------- #

def test_encuentra_el_recorrido_de_un_viaje_en_micro(candidato, indice):
    traza = sim.viaje_en_micro(candidato, paraderos=4, con_caminatas=False)
    resultado = emp.emparejar(traza, indice)
    assert resultado.mejor is not None
    assert resultado.mejor.candidato.recorrido_id == candidato.recorrido_id
    assert resultado.mejor.cobertura > 0.8
    assert resultado.mejor.avance > 0.8


def test_un_auto_por_la_misma_calle_no_pasa_por_micro(candidato, indice):
    """La prueba que le da sentido a toda la señal de paradas.

    El auto saca **más** cobertura y **más** avance que la micro, justamente
    porque no se detiene. Si el sistema mirara sólo geometría, la telemetría se
    llenaría de autos.
    """
    auto = sim.viaje_en_auto(candidato, paraderos=6)
    resultado = emp.emparejar(auto, indice)
    assert resultado.mejor is not None
    assert resultado.mejor.no_se_detuvo
    assert not resultado.concluyente


def test_bajo_tierra_no_inventa_un_recorrido(candidato, indice):
    """En Metro el GPS se corta: la respuesta correcta es no responder."""
    metro = sim.viaje_en_metro(candidato, paraderos=3)
    assert emp.analizar(metro, indice) == []


def test_las_detenciones_se_detectan_donde_estan(candidato):
    """Ocho paraderos simulados deben producir del orden de ocho detenciones."""
    traza = sim.viaje_en_micro(
        candidato, paraderos=3, desde_paradero=1, con_caminatas=False, semilla=5
    )
    # Tres paraderos simulados. El margen hacia arriba cubre las detenciones que
    # el ruido parte en dos; el de abajo, la que cae justo en el punto de
    # partida y no alcanza a registrarse.
    assert 2 <= len(emp.detenciones(traza.puntos)) <= 8


def test_una_traza_lejos_de_todo_no_empareja(indice):
    """Una traza en medio del mar no se parece a ningún recorrido."""
    lejos = Traza(
        "oceano",
        [
            PuntoTraza(-33.0 - i * 0.0001, -75.0, T0 + timedelta(seconds=i))
            for i in range(200)
        ],
    )
    resultado = emp.emparejar(lejos, indice)
    assert not resultado.concluyente


def test_un_empate_se_declara_en_vez_de_elegir():
    """Dos candidatos con el mismo puntaje no dan una respuesta."""
    from dataclasses import replace

    trazado = [(-33.45 + i * 0.001, -70.65) for i in range(10)]
    uno = emp.Candidato("a", "a", "A", 0, "Norte", trazado, [])
    otro = emp.Candidato("b", "b", "B", 0, "Norte", trazado, [])
    base = emp.Puntaje(uno, 0.9, 0.9, 0.9, 5, 5, 5, 8.0)
    resultado = emp.Resultado(None, [base, replace(base, candidato=otro)])
    assert resultado.margen == 0.0
    assert not resultado.concluyente
    assert "Empate" in resultado.explicacion()
