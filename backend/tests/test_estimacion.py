"""Pruebas del motor de llegadas.

Lo que se prueba acá es la lógica, con posiciones inventadas a mano. El
adaptador del servicio del DTPM todavía no existe —falta la documentación del
formato— y a propósito no se prueba contra él: el motor no debe saber de dónde
vienen las posiciones (`docs/01` §1.5).

El caso que más importa es `test_no_viene_ninguna`: es la única respuesta que
ninguna app de la competencia puede dar, y la razón de ser del producto.
"""

from datetime import datetime, timedelta, timezone

import pytest

from gtfs.geo import TrazadoIndexado
from estimacion.flota import CADUCIDAD_S, Flota, Posicion
from estimacion.llegadas import (
    Estado,
    Respuesta,
    estimar,
    responder,
)

T0 = datetime(2026, 10, 9, 8, 0, tzinfo=timezone.utc)

#: Un trazado recto hacia el norte, un punto cada ~111 m, 10 km en total.
TRAZADO = [(-33.60 + i * 0.001, -70.65) for i in range(91)]
GRADO_M = 111_320.0


def trazados():
    return {("R506", 0): TrazadoIndexado(TRAZADO)}


def posicion(metros: float, t: datetime, *, vehiculo="bus-1", desvio_m=0.0):
    """Un bus a `metros` del inicio del trazado."""
    return Posicion(
        vehiculo_id=vehiculo,
        recorrido_id="R506",
        sentido=0,
        lat=-33.60 + metros / GRADO_M,
        lon=-70.65 + desvio_m / (GRADO_M * 0.83),
        t=t,
    )


def flota_con(*muestras):
    f = Flota(trazados())
    for metros, segundos in muestras:
        f.actualizar([posicion(metros, T0 + timedelta(seconds=segundos))])
    return f


# --------------------------------------------------------------------------- #
# Seguimiento de la flota
# --------------------------------------------------------------------------- #

def test_ubica_el_bus_sobre_su_trazado():
    f = flota_con((2000, 0))
    bus = f.vehiculos["bus-1"]
    assert bus.s == pytest.approx(2000, abs=30)
    assert bus.desviacion_m < 10


def test_calcula_la_velocidad_de_avance():
    # 300 m en 60 s = 5 m/s.
    f = flota_con((1000, 0), (1150, 30), (1300, 60))
    assert f.vehiculos["bus-1"].velocidad_ms == pytest.approx(5.0, rel=0.1)


def test_detecta_el_bus_fuera_de_su_trazado():
    f = Flota(trazados())
    f.actualizar([posicion(2000, T0, desvio_m=400)])
    assert f.vehiculos["bus-1"].fuera_de_trazado


def test_una_posicion_de_un_recorrido_desconocido_se_cuenta_y_se_ignora():
    """Una fuente que cambia de formato tiene que verse antes que el usuario."""
    f = Flota(trazados())
    f.actualizar(
        [Posicion("x", "RECORRIDO-QUE-NO-EXISTE", 0, -33.5, -70.6, T0)]
    )
    assert f.sin_trazado == 1
    assert not f.vehiculos


def test_olvida_los_buses_que_dejaron_de_reportar():
    f = flota_con((1000, 0))
    assert f.olvidar_viejos(T0 + timedelta(seconds=CADUCIDAD_S + 1)) == 1
    assert not f.vehiculos


# --------------------------------------------------------------------------- #
# Estimación
# --------------------------------------------------------------------------- #

def test_estima_el_tiempo_de_llegada():
    f = flota_con((1000, 0), (1150, 30), (1300, 60))
    llegada = estimar(f.vehiculos["bus-1"], 2300.0)
    assert llegada is not None
    # 1000 m a una mezcla de 5 m/s propios y 5 de referencia = 200 s.
    assert llegada.eta_s == pytest.approx(200, rel=0.15)
    assert llegada.estado is Estado.EN_RUTA


def test_el_rango_es_mas_ancho_cuando_el_bus_esta_mas_lejos():
    """La incertidumbre crece con el tiempo estimado, no es un valor fijo."""
    f = flota_con((1000, 0), (1150, 30), (1300, 60))
    bus = f.vehiculos["bus-1"]
    cerca = estimar(bus, 1600.0)
    lejos = estimar(bus, 8000.0)
    assert cerca and lejos
    assert lejos.sigma_s > cerca.sigma_s * 2


def test_un_bus_que_ya_paso_no_es_una_llegada():
    """El error más irritante que puede cometer una app de transporte."""
    f = flota_con((5000, 0))
    assert estimar(f.vehiculos["bus-1"], 2000.0) is None


def test_un_bus_detenido_justo_en_el_paradero_sigue_contando():
    """Pasado por 30 m es estar **en** el paradero, no haberlo dejado atrás."""
    f = flota_con((2030, 0))
    llegada = estimar(f.vehiculos["bus-1"], 2000.0)
    assert llegada is not None
    assert llegada.distancia_m == pytest.approx(0.0, abs=35)


def test_marca_el_bus_detenido():
    f = flota_con((1000, 0), (1002, 60), (1003, 120))
    llegada = estimar(f.vehiculos["bus-1"], 4000.0)
    assert llegada is not None
    assert llegada.estado is Estado.DETENIDO


# --------------------------------------------------------------------------- #
# El veredicto
# --------------------------------------------------------------------------- #

def test_viene():
    f = flota_con((1000, 0), (1150, 30), (1300, 60))
    v = responder(f, "R506", 0, 3000.0, ahora=T0 + timedelta(seconds=60))
    assert v.respuesta is Respuesta.VIENE
    assert v.proxima is not None


def test_no_viene_ninguna():
    """La respuesta que ninguna otra app puede dar.

    Hay buses del recorrido reportando, pero todos quedaron atrás del paradero.
    El horario seguiría diciendo «cada diez minutos»; la verdad es que no viene
    ninguna.
    """
    f = Flota(trazados())
    f.actualizar([posicion(6000, T0, vehiculo="bus-1")])
    f.actualizar([posicion(7000, T0, vehiculo="bus-2")])
    v = responder(f, "R506", 0, 2000.0, ahora=T0)
    assert v.respuesta is Respuesta.NO_VIENE
    assert v.llegadas == []


def test_sin_datos_no_es_lo_mismo_que_no_viene():
    """Que se caiga la fuente no autoriza a decirle a nadie que no viene."""
    f = Flota(trazados())
    f.actualizar([posicion(1000, T0)])
    tarde = T0 + timedelta(seconds=CADUCIDAD_S + 1)
    assert responder(f, "R506", 0, 3000.0, ahora=tarde).respuesta is Respuesta.SIN_DATOS


def test_un_bus_mas_alla_del_horizonte_no_cuenta_como_que_viene():
    """Un bus a veinte minutos no cambia la decisión de nadie."""
    f = Flota(trazados())
    f.actualizar([posicion(100, T0)])
    v = responder(f, "R506", 0, 9500.0, ahora=T0, horizonte_m=3000.0)
    assert v.respuesta is Respuesta.NO_VIENE


def test_las_llegadas_salen_ordenadas():
    f = Flota(trazados())
    for metros, bus in ((1000, "lejos"), (2500, "cerca"), (1800, "medio")):
        f.actualizar([posicion(metros, T0, vehiculo=bus)])
    v = responder(f, "R506", 0, 3000.0, ahora=T0)
    assert [l.vehiculo_id for l in v.llegadas] == ["cerca", "medio", "lejos"]
