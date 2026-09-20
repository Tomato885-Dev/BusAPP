"""Lectura de un feed GTFS.

Lee el .zip (o un directorio ya descomprimido) y entrega registros tipados. No
toca la base de datos: eso permite probar toda la lógica sin infraestructura.

Sólo se cargan los archivos que el producto necesita. GTFS define muchos más,
pero cargar lo que no se usa sólo agrega superficie de error.
"""

from __future__ import annotations

import csv
import io
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

from .geo import Punto


@dataclass(frozen=True)
class Parada:
    id: str
    codigo: str        # el código que el usuario ve en el paradero (ej. "PA420")
    nombre: str
    lat: float
    lon: float

    @property
    def punto(self) -> Punto:
        return (self.lat, self.lon)


@dataclass(frozen=True)
class Recorrido:
    id: str
    nombre_corto: str  # lo que la gente llama "la 506"
    nombre_largo: str
    tipo: int          # 3 = bus, 1 = metro (según la especificación GTFS)
    # Colores oficiales del recorrido, en hexadecimal y sin almohadilla. El
    # feed los trae para toda la red: los del Metro y los de cada zona de
    # micros, que son los mismos con que están pintados los buses.
    color: str
    color_texto: str


@dataclass(frozen=True)
class Viaje:
    id: str
    recorrido_id: str
    servicio_id: str
    letrero: str       # destino que muestra el bus
    trazado_id: str | None
    sentido: int | None


@dataclass(frozen=True)
class Frecuencia:
    """Intervalo entre buses de un viaje, dentro de una franja horaria.

    La red de Santiago opera por frecuencia y no por horario fijo: el feed no
    dice «la 506 pasa a las 14:07», dice «entre las 13:00 y las 18:00 pasa cada
    11 minutos». Es el dato honesto para estimar una espera sin información en
    vivo.
    """

    viaje_id: str
    inicio_s: int   # segundos desde medianoche
    fin_s: int
    intervalo_s: int


@dataclass(frozen=True)
class PasoPorParada:
    viaje_id: str
    parada_id: str
    orden: int
    hora_llegada: str | None
    hora_salida: str | None
    distancia_recorrida: float | None  # shape_dist_traveled, si el feed la trae


@dataclass
class Feed:
    """Un feed GTFS completo, en memoria."""

    paradas: dict[str, Parada] = field(default_factory=dict)
    recorridos: dict[str, Recorrido] = field(default_factory=dict)
    viajes: dict[str, Viaje] = field(default_factory=dict)
    trazados: dict[str, list[Punto]] = field(default_factory=dict)
    pasos: list[PasoPorParada] = field(default_factory=list)
    frecuencias: dict[str, list[Frecuencia]] = field(default_factory=dict)

    # Índice perezoso de pasos por viaje. Se construye en el primer uso.
    _indice: dict[str, list[PasoPorParada]] | None = field(
        default=None, repr=False, compare=False
    )

    def pasos_por_viaje(self, viaje_id: str) -> list[PasoPorParada]:
        """Paradas de un viaje, en orden.

        Va por un índice y no por un recorrido lineal de ``pasos`` porque el
        feed real de Santiago trae 1,1 millones de pasos y 26.000 viajes:
        filtrar la lista completa en cada llamada son 28 mil millones de
        comparaciones, y la ingesta no termina nunca. Con índice son 1,1
        millones de inserciones, una sola vez.

        El índice se invalida con `olvidar_indice` si se modifica ``pasos``.
        """
        if self._indice is None:
            indice: dict[str, list[PasoPorParada]] = {}
            for paso in self.pasos:
                indice.setdefault(paso.viaje_id, []).append(paso)
            for lista in indice.values():
                lista.sort(key=lambda p: p.orden)
            self._indice = indice
        return self._indice.get(viaje_id, [])

    def olvidar_indice(self) -> None:
        """Invalida el índice tras modificar ``pasos``."""
        self._indice = None

    def resumen(self) -> str:
        return (
            f"{len(self.paradas)} paradas · {len(self.recorridos)} recorridos · "
            f"{len(self.viajes)} viajes · {len(self.trazados)} trazados · "
            f"{len(self.pasos)} pasos por parada"
        )


# --------------------------------------------------------------------------- #
# Lectura
# --------------------------------------------------------------------------- #

class _Fuente:
    """Abstrae leer desde un .zip o desde un directorio."""

    def __init__(self, ruta: Path):
        self.ruta = ruta
        self._zip = zipfile.ZipFile(ruta) if ruta.is_file() else None

    def leer(self, nombre: str) -> list[dict[str, str]] | None:
        """Lee un archivo del feed como lista de diccionarios, o None si falta."""
        if self._zip is not None:
            if nombre not in self._zip.namelist():
                return None
            crudo = self._zip.read(nombre).decode("utf-8-sig")
        else:
            archivo = self.ruta / nombre
            if not archivo.exists():
                return None
            crudo = archivo.read_text(encoding="utf-8-sig")
        return list(csv.DictReader(io.StringIO(crudo)))

    def cerrar(self) -> None:
        if self._zip is not None:
            self._zip.close()


def _a_segundos(hora: str) -> int | None:
    """Hora GTFS a segundos desde medianoche.

    GTFS admite horas mayores a 24:00:00 para servicios que cruzan la
    medianoche, así que no se puede usar un parser de hora del reloj.
    """
    try:
        h, m, s = (int(parte) for parte in hora.split(":"))
    except (ValueError, AttributeError):
        return None
    return h * 3600 + m * 60 + s


def _limpiar_nombre(nombre: str, codigo: str) -> str:
    """Quita el código repetido al inicio del nombre.

    El feed del DTPM trae los nombres como ``"PD1641-Parada 7 / (M) Macul"``:
    el código va otra vez adentro del nombre. En pantalla eso es ruido, porque
    el código ya se muestra aparte.
    """
    nombre = nombre.strip()
    prefijo = f"{codigo}-"
    return nombre[len(prefijo):].strip() if nombre.startswith(prefijo) else nombre


def _limpiar_letrero(letrero: str) -> str:
    """Traduce la notación del DTPM para los recorridos circulares.

    El feed marca los circuitos con ``"© Lo Valledor - Lo Espejo"``. Ese símbolo
    no es un error de codificación —viene así en 1.928 viajes— pero en pantalla
    se lee como un signo de copyright, que no significa nada para el pasajero.
    """
    letrero = letrero.strip()
    if letrero.startswith("©"):
        return f"Circuito {letrero.lstrip('©').strip()}"
    return letrero


def _decimal(valor: str | None) -> float | None:
    """Convierte a float tolerando vacíos y basura, en vez de reventar."""
    if valor is None or valor.strip() == "":
        return None
    try:
        return float(valor)
    except ValueError:
        return None


def leer_feed(ruta: str | Path) -> Feed:
    """Lee un feed GTFS desde un .zip o un directorio descomprimido.

    Raises:
        FileNotFoundError: si la ruta no existe.
        ValueError: si faltan archivos obligatorios del feed.
    """
    ruta = Path(ruta)
    if not ruta.exists():
        raise FileNotFoundError(f"No existe el feed: {ruta}")

    fuente = _Fuente(ruta)
    try:
        feed = Feed()

        filas = fuente.leer("stops.txt")
        if filas is None:
            raise ValueError("El feed no trae stops.txt, que es obligatorio")
        for f in filas:
            lat, lon = _decimal(f.get("stop_lat")), _decimal(f.get("stop_lon"))
            if lat is None or lon is None:
                continue  # una parada sin coordenadas no sirve para nada
            codigo = (f.get("stop_code") or f["stop_id"]).strip()
            feed.paradas[f["stop_id"]] = Parada(
                id=f["stop_id"],
                codigo=codigo,
                nombre=_limpiar_nombre(f.get("stop_name") or "", codigo),
                lat=lat,
                lon=lon,
            )

        filas = fuente.leer("routes.txt")
        if filas is None:
            raise ValueError("El feed no trae routes.txt, que es obligatorio")
        for f in filas:
            feed.recorridos[f["route_id"]] = Recorrido(
                id=f["route_id"],
                nombre_corto=(f.get("route_short_name") or "").strip(),
                nombre_largo=(f.get("route_long_name") or "").strip(),
                tipo=int(f.get("route_type") or 3),
                color=(f.get("route_color") or "").strip(),
                color_texto=(f.get("route_text_color") or "").strip(),
            )

        filas = fuente.leer("trips.txt")
        if filas is None:
            raise ValueError("El feed no trae trips.txt, que es obligatorio")
        for f in filas:
            sentido = f.get("direction_id")
            feed.viajes[f["trip_id"]] = Viaje(
                id=f["trip_id"],
                recorrido_id=f["route_id"],
                servicio_id=f.get("service_id", ""),
                letrero=_limpiar_letrero(f.get("trip_headsign") or ""),
                trazado_id=(f.get("shape_id") or None),
                sentido=int(sentido) if sentido not in (None, "") else None,
            )

        filas = fuente.leer("shapes.txt")
        if filas:
            puntos: dict[str, list[tuple[int, float, float]]] = {}
            for f in filas:
                lat, lon = _decimal(f.get("shape_pt_lat")), _decimal(f.get("shape_pt_lon"))
                if lat is None or lon is None:
                    continue
                orden = int(f.get("shape_pt_sequence") or 0)
                puntos.setdefault(f["shape_id"], []).append((orden, lat, lon))
            for shape_id, lista in puntos.items():
                lista.sort(key=lambda t: t[0])
                feed.trazados[shape_id] = [(lat, lon) for _, lat, lon in lista]

        filas = fuente.leer("stop_times.txt")
        if filas is None:
            raise ValueError("El feed no trae stop_times.txt, que es obligatorio")
        for f in filas:
            feed.pasos.append(
                PasoPorParada(
                    viaje_id=f["trip_id"],
                    parada_id=f["stop_id"],
                    orden=int(f.get("stop_sequence") or 0),
                    hora_llegada=(f.get("arrival_time") or None),
                    hora_salida=(f.get("departure_time") or None),
                    distancia_recorrida=_decimal(f.get("shape_dist_traveled")),
                )
            )

        filas = fuente.leer("frequencies.txt")
        if filas:
            for f in filas:
                inicio = _a_segundos(f.get("start_time", ""))
                fin = _a_segundos(f.get("end_time", ""))
                try:
                    intervalo = int(f.get("headway_secs") or 0)
                except ValueError:
                    intervalo = 0
                if inicio is None or fin is None or intervalo <= 0:
                    continue
                feed.frecuencias.setdefault(f["trip_id"], []).append(
                    Frecuencia(f["trip_id"], inicio, fin, intervalo)
                )

        return feed
    finally:
        fuente.cerrar()
