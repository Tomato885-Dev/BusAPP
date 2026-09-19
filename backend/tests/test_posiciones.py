"""Pruebas de la ubicación de paradas sobre el trazado.

Es el dato derivado del que depende todo el motor de estimación, así que las
pruebas miran propiedades (orden, coherencia) y no sólo que no reviente.
"""

from pathlib import Path

import pytest

from gtfs.geo import largo_m
from gtfs.parse import leer_feed
from gtfs.posiciones import (
    distancia_entre_paradas,
    distancia_restante,
    ubicar_paradas,
)

FIXTURE = Path(__file__).parent / "fixtures" / "gtfs_ejemplo"


@pytest.fixture
def feed():
    return leer_feed(FIXTURE)


def test_ubica_todas_las_paradas_del_viaje(feed):
    ubicadas = ubicar_paradas(feed, "T506-1")
    assert [u.parada_id for u in ubicadas] == ["S1", "S2", "S3", "S4", "S5", "S6"]


def test_las_distancias_crecen_con_el_orden(feed):
    ubicadas = ubicar_paradas(feed, "T506-1")
    distancias = [u.distancia_recorrida for u in ubicadas]
    assert distancias == sorted(distancias)
    assert distancias[0] == pytest.approx(0.0, abs=20)


def test_ninguna_parada_queda_lejos_de_su_trazado(feed):
    """Las paradas del fixture están ~11 m al costado del eje, como en la calle."""
    ubicadas = ubicar_paradas(feed, "T506-1")
    assert all(u.desviacion < 30 for u in ubicadas)
    assert not any(u.sospechosa for u in ubicadas)


def test_la_ultima_parada_queda_cerca_del_final_del_trazado(feed):
    ubicadas = ubicar_paradas(feed, "T506-1")
    total = largo_m(feed.trazados["SH506"])
    assert ubicadas[-1].distancia_recorrida == pytest.approx(total, abs=50)


def test_distancia_entre_paradas(feed):
    ubicadas = ubicar_paradas(feed, "T506-1")
    d = distancia_entre_paradas(ubicadas, "S1", "S4")
    assert d is not None and 2000 < d < 2600


def test_distancia_entre_paradas_en_orden_inverso_es_none(feed):
    ubicadas = ubicar_paradas(feed, "T506-1")
    assert distancia_entre_paradas(ubicadas, "S4", "S1") is None
    assert distancia_entre_paradas(ubicadas, "S1", "NO_EXISTE") is None


def test_distancia_restante_a_un_paradero(feed):
    """El caso de uso real: un bus en marcha y el paradero donde alguien espera."""
    ubicadas = ubicar_paradas(feed, "T506-1")
    parada5 = next(u for u in ubicadas if u.parada_id == "S4")
    trazado = feed.trazados["SH506"]

    bus_antes = (-33.4551, -70.6020)  # a la altura de Tobalaba, todavía no llega
    restante = distancia_restante(bus_antes, trazado, parada5)
    assert restante is not None and 500 < restante < 800


def test_distancia_restante_es_none_si_el_bus_ya_paso(feed):
    ubicadas = ubicar_paradas(feed, "T506-1")
    parada5 = next(u for u in ubicadas if u.parada_id == "S4")
    trazado = feed.trazados["SH506"]

    bus_despues = (-33.4574, -70.6198)
    assert distancia_restante(bus_despues, trazado, parada5) is None


def test_el_tramo_compartido_da_la_misma_posicion_en_ambos_recorridos(feed):
    """El caso difícil de docs/04 §4.5.

    La 506 y la D09 comparten el eje Grecia hasta la Parada 5. Un bus en ese
    tramo está, geométricamente, sobre ambos trazados: la distancia que le falta
    para llegar a la Parada 5 es casi la misma por cualquiera de los dos. Por eso
    la posición sola no basta para saber en qué recorrido va.
    """
    bus = (-33.4556, -70.6055)
    p506 = next(u for u in ubicar_paradas(feed, "T506-1") if u.parada_id == "S4")
    pd09 = next(u for u in ubicar_paradas(feed, "TD09-1") if u.parada_id == "S4")

    r506 = distancia_restante(bus, feed.trazados["SH506"], p506)
    rd09 = distancia_restante(bus, feed.trazados["SHD09"], pd09)

    assert r506 is not None and rd09 is not None
    assert abs(r506 - rd09) < 30, "en el tramo compartido, ambas hipótesis coinciden"


def test_viaje_sin_trazado(feed):
    feed.viajes["T506-1"] = feed.viajes["T506-1"].__class__(
        id="T506-1", recorrido_id="R506", servicio_id="SEMANA",
        letrero="Peñalolén", trazado_id=None, sentido=0,
    )
    with pytest.raises(ValueError, match="trazado"):
        ubicar_paradas(feed, "T506-1")


def test_viaje_inexistente(feed):
    with pytest.raises(KeyError):
        ubicar_paradas(feed, "NO_EXISTE")
