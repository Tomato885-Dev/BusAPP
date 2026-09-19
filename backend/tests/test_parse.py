"""Pruebas de lectura del feed."""

import zipfile
from pathlib import Path

import pytest

from gtfs.parse import leer_feed

FIXTURE = Path(__file__).parent / "fixtures" / "gtfs_ejemplo"


def test_lee_directorio():
    feed = leer_feed(FIXTURE)
    assert len(feed.paradas) == 8
    assert len(feed.recorridos) == 2
    assert len(feed.viajes) == 2
    assert len(feed.trazados) == 2
    assert len(feed.pasos) == 10


def test_lee_zip(tmp_path):
    destino = tmp_path / "GTFS.zip"
    with zipfile.ZipFile(destino, "w") as z:
        for archivo in FIXTURE.glob("*.txt"):
            z.write(archivo, archivo.name)

    feed = leer_feed(destino)
    assert len(feed.paradas) == 8
    assert feed.recorridos["R506"].nombre_corto == "506"


def test_conserva_el_codigo_visible_de_la_parada():
    feed = leer_feed(FIXTURE)
    assert feed.paradas["S4"].codigo == "PA420"
    assert feed.paradas["S4"].nombre == "Parada 5 / Av. Grecia"


def test_pasos_por_viaje_vienen_ordenados():
    feed = leer_feed(FIXTURE)
    pasos = feed.pasos_por_viaje("T506-1")
    assert [p.orden for p in pasos] == [1, 2, 3, 4, 5, 6]
    assert [p.parada_id for p in pasos] == ["S1", "S2", "S3", "S4", "S5", "S6"]


def test_trazado_ordenado_por_secuencia():
    feed = leer_feed(FIXTURE)
    trazado = feed.trazados["SH506"]
    assert len(trazado) == 11
    # El recorrido avanza al poniente: la longitud decrece.
    assert [lon for _, lon in trazado] == sorted((lon for _, lon in trazado), reverse=True)


def test_ruta_inexistente():
    with pytest.raises(FileNotFoundError):
        leer_feed("/no/existe/feed")


def test_feed_incompleto(tmp_path):
    (tmp_path / "stops.txt").write_text("stop_id,stop_lat,stop_lon\nS1,-33.45,-70.60\n")
    with pytest.raises(ValueError, match="routes.txt"):
        leer_feed(tmp_path)


def test_ignora_paradas_sin_coordenadas(tmp_path):
    for nombre in ("routes.txt", "trips.txt", "stop_times.txt"):
        (tmp_path / nombre).write_text(
            {"routes.txt": "route_id,route_short_name,route_long_name,route_type\n",
             "trips.txt": "route_id,service_id,trip_id\n",
             "stop_times.txt": "trip_id,stop_id,stop_sequence\n"}[nombre]
        )
    (tmp_path / "stops.txt").write_text(
        "stop_id,stop_lat,stop_lon\nBUENA,-33.45,-70.60\nMALA,,\nRARA,texto,-70.60\n"
    )
    feed = leer_feed(tmp_path)
    assert list(feed.paradas) == ["BUENA"]


def test_limpia_el_codigo_repetido_en_el_nombre(tmp_path):
    """El feed del DTPM trae 'PD1641-Parada 7 / (M) Macul' como nombre."""
    for nombre, contenido in (
        ("routes.txt", "route_id,route_short_name,route_long_name,route_type\n"),
        ("trips.txt", "route_id,service_id,trip_id\n"),
        ("stop_times.txt", "trip_id,stop_id,stop_sequence\n"),
    ):
        (tmp_path / nombre).write_text(contenido)
    (tmp_path / "stops.txt").write_text(
        "stop_id,stop_code,stop_name,stop_lat,stop_lon\n"
        "A,PD1641,PD1641-Parada 7 / (M) Macul,-33.50,-70.58\n"
        "B,PA420,Parada 5 / Av. Grecia,-33.45,-70.60\n"
    )
    feed = leer_feed(tmp_path)
    assert feed.paradas["A"].nombre == "Parada 7 / (M) Macul"
    assert feed.paradas["B"].nombre == "Parada 5 / Av. Grecia", "sin prefijo, no se toca"


def test_limpiar_letrero_traduce_los_circuitos():
    """El feed del DTPM marca los recorridos circulares con «©».

    No es basura de codificación: viene así en 1.928 viajes. Pero en pantalla se
    lee como un signo de copyright, que al pasajero no le dice nada.
    """
    from gtfs.parse import _limpiar_letrero

    assert _limpiar_letrero("© Lo Valledor - Lo Espejo") == "Circuito Lo Valledor - Lo Espejo"
    assert _limpiar_letrero("©Villa El Abrazo") == "Circuito Villa El Abrazo"
    # Un letrero normal no se toca.
    assert _limpiar_letrero("Renca") == "Renca"
    assert _limpiar_letrero("  Plaza Italia  ") == "Plaza Italia"
