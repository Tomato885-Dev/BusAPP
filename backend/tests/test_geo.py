"""Pruebas de la geometría sobre recorridos."""

import math

import pytest

from gtfs.geo import (
    distancia_m,
    distancias_acumuladas,
    largo_m,
    proyectar,
    proyectar_secuencia,
    punto_a_distancia,
)

# Tramo recto de ~1,1 km sobre Av. Grecia, de oriente a poniente.
TRAZADO = [(-33.4550, -70.6020), (-33.4555, -70.6060), (-33.4560, -70.6100)]


def test_distancia_conocida():
    # Un grado de latitud son ~111 km en cualquier meridiano.
    d = distancia_m((-33.0, -70.6), (-34.0, -70.6))
    assert 110_500 < d < 111_500


def test_distancia_es_simetrica_y_nula_en_el_mismo_punto():
    a, b = (-33.4550, -70.6020), (-33.4560, -70.6100)
    assert distancia_m(a, b) == pytest.approx(distancia_m(b, a))
    assert distancia_m(a, a) == pytest.approx(0.0, abs=1e-9)


def test_acumuladas_crecen_y_terminan_en_el_largo_total():
    acum = distancias_acumuladas(TRAZADO)
    assert acum[0] == 0.0
    assert acum == sorted(acum)
    assert acum[-1] == pytest.approx(largo_m(TRAZADO))


def test_proyectar_un_vertice_cae_sobre_el_trazado():
    acum = distancias_acumuladas(TRAZADO)
    proy = proyectar(TRAZADO[1], TRAZADO)
    assert proy.desviacion == pytest.approx(0.0, abs=0.5)
    assert proy.distancia_recorrida == pytest.approx(acum[1], abs=1.0)


def test_proyectar_punto_desplazado_mide_la_desviacion():
    # ~111 m al norte del segundo vértice (0.001 grados de latitud).
    desplazado = (TRAZADO[1][0] + 0.001, TRAZADO[1][1])
    proy = proyectar(desplazado, TRAZADO)
    assert 100 < proy.desviacion < 125


def test_proyectar_antes_del_inicio_se_acota_a_cero():
    antes = (-33.4545, -70.5990)  # al oriente del primer vértice
    proy = proyectar(antes, TRAZADO)
    assert proy.distancia_recorrida == pytest.approx(0.0, abs=1.0)


def test_proyectar_despues_del_final_se_acota_al_largo():
    despues = (-33.4565, -70.6140)  # al poniente del último vértice
    proy = proyectar(despues, TRAZADO)
    assert proy.distancia_recorrida == pytest.approx(largo_m(TRAZADO), abs=1.0)


def test_proyectar_exige_al_menos_dos_puntos():
    with pytest.raises(ValueError):
        proyectar((-33.455, -70.606), [(-33.455, -70.606)])


def test_avance_monotono_sobre_un_recorrido_de_ida_y_vuelta():
    """El caso que rompe una proyección ingenua.

    Un recorrido que va y vuelve por la misma calle hace que un punto del tramo
    de vuelta proyecte sobre el de ida, y la distancia recorrida retroceda.
    """
    ida_y_vuelta = TRAZADO + [(-33.4555, -70.6060), (-33.4550, -70.6020)]
    traza = [(-33.4550, -70.6020), (-33.4555, -70.6060), (-33.4560, -70.6100),
             (-33.4555, -70.6060), (-33.4550, -70.6020)]

    ingenua = [proyectar(p, ida_y_vuelta).distancia_recorrida for p in traza]
    assert ingenua != sorted(ingenua), "el caso de prueba debería retroceder"

    monotona = [p.distancia_recorrida for p in proyectar_secuencia(traza, ida_y_vuelta)]
    assert monotona == sorted(monotona)


def test_punto_a_distancia_es_la_inversa_de_proyectar():
    objetivo = largo_m(TRAZADO) * 0.4
    punto = punto_a_distancia(TRAZADO, objetivo)
    assert proyectar(punto, TRAZADO).distancia_recorrida == pytest.approx(objetivo, abs=1.0)


def test_punto_a_distancia_se_acota_en_los_extremos():
    assert punto_a_distancia(TRAZADO, -100) == TRAZADO[0]
    assert punto_a_distancia(TRAZADO, 1e9) == TRAZADO[-1]


def test_segmento_degenerado_no_revienta():
    """Los feeds reales traen vértices repetidos."""
    con_repetido = [(-33.4550, -70.6020), (-33.4550, -70.6020), (-33.4560, -70.6100)]
    proy = proyectar((-33.4555, -70.6060), con_repetido)
    assert math.isfinite(proy.distancia_recorrida)
    assert math.isfinite(proy.desviacion)
