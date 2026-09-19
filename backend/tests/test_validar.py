"""Pruebas de la validación del feed."""

from pathlib import Path

import pytest

from gtfs.parse import leer_feed
from gtfs.validar import Nivel, validar

FIXTURE = Path(__file__).parent / "fixtures" / "gtfs_ejemplo"


@pytest.fixture
def feed():
    return leer_feed(FIXTURE)


def test_el_fixture_es_apto(feed):
    rep = validar(feed)
    assert rep.apto_para_produccion, str(rep)


def test_feed_sin_trazados_es_error(feed):
    feed.trazados.clear()
    for vid, v in list(feed.viajes.items()):
        feed.viajes[vid] = v.__class__(
            id=v.id, recorrido_id=v.recorrido_id, servicio_id=v.servicio_id,
            letrero=v.letrero, trazado_id=None, sentido=v.sentido,
        )
    rep = validar(feed)
    assert not rep.apto_para_produccion
    assert any("trazado" in h.mensaje for h in rep.errores)


def test_viaje_huerfano_es_error(feed):
    v = feed.viajes["T506-1"]
    feed.viajes["T506-1"] = v.__class__(
        id=v.id, recorrido_id="NO_EXISTE", servicio_id=v.servicio_id,
        letrero=v.letrero, trazado_id=v.trazado_id, sentido=v.sentido,
    )
    rep = validar(feed)
    assert not rep.apto_para_produccion
    assert any("recorrido inexistente" in h.mensaje for h in rep.errores)


def test_parada_referenciada_que_no_existe_es_error(feed):
    del feed.paradas["S2"]
    rep = validar(feed)
    assert not rep.apto_para_produccion


def test_parada_lejos_de_su_trazado_se_detecta(feed):
    """Mover una parada 2 km al sur debe delatar el problema de datos."""
    p = feed.paradas["S3"]
    feed.paradas["S3"] = p.__class__(
        id=p.id, codigo=p.codigo, nombre=p.nombre, lat=p.lat - 0.02, lon=p.lon,
    )
    rep = validar(feed)
    assert any("no calzan con su trazado" in h.mensaje for h in rep.hallazgos)


def test_feed_vacio_acumula_errores():
    from gtfs.parse import Feed

    rep = validar(Feed())
    mensajes = " ".join(h.mensaje for h in rep.errores)
    for esperado in ("paradas", "recorridos", "viajes", "horarios"):
        assert esperado in mensajes


def test_el_reporte_siempre_informa_el_contenido(feed):
    rep = validar(feed)
    infos = [h for h in rep.hallazgos if h.nivel is Nivel.INFO]
    assert any("paradas" in h.detalle for h in infos)
