"""Interfaz de línea de comandos de la ingesta.

    python -m gtfs.cli descargar  [--destino data/GTFS.zip]
    python -m gtfs.cli resumen    <feed>
    python -m gtfs.cli validar    <feed>
    python -m gtfs.cli exportar   <feed> --destino ../prototipo/datos.json
    python -m gtfs.cli paraderos  <feed> --centro -33.4451,-70.6544
    python -m gtfs.cli cargar     <feed> --dsn postgresql://...

``<feed>`` es un .zip o un directorio ya descomprimido.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

from .geo import largo_m
from .parse import leer_feed
from .posiciones import ubicar_paradas
from .validar import Nivel, validar

URL_GTFS = "https://www.dtpm.cl/descargas/gtfs/GTFS.zip"


def _descargar(args: argparse.Namespace) -> int:
    destino = Path(args.destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    print(f"Descargando {args.url}")
    try:
        with urllib.request.urlopen(args.url, timeout=120) as r, destino.open("wb") as f:
            total = 0
            while chunk := r.read(1 << 16):
                f.write(chunk)
                total += len(chunk)
    except Exception as e:  # noqa: BLE001 — cualquier fallo de red es informativo
        print(f"Error al descargar: {e}", file=sys.stderr)
        print(
            "\nSi estás detrás de un proxy corporativo o el host está bloqueado,\n"
            "baja el archivo a mano y pásale la ruta a los demás comandos.",
            file=sys.stderr,
        )
        return 1
    print(f"Guardado en {destino} ({total / 1e6:.1f} MB)")
    return 0


def _resumen(args: argparse.Namespace) -> int:
    feed = leer_feed(args.feed)
    print(feed.resumen())
    print()
    buses = sum(1 for r in feed.recorridos.values() if r.tipo == 3)
    metro = sum(1 for r in feed.recorridos.values() if r.tipo == 1)
    print(f"  Recorridos de bus : {buses}")
    print(f"  Recorridos de metro: {metro}")
    con_trazado = sum(1 for v in feed.viajes.values() if v.trazado_id)
    print(f"  Viajes con trazado : {con_trazado} de {len(feed.viajes)}")
    if feed.trazados:
        largos = sorted(largo_m(t) for t in feed.trazados.values() if len(t) >= 2)
        if largos:
            print(f"  Largo de recorrido : mediana {largos[len(largos) // 2] / 1000:.1f} km, "
                  f"máximo {largos[-1] / 1000:.1f} km")
    return 0


def _validar(args: argparse.Namespace) -> int:
    feed = leer_feed(args.feed)
    reporte = validar(feed, muestra_viajes=args.muestra)
    print(reporte)
    print()
    if reporte.apto_para_produccion:
        print("✓ El feed es apto para producción.")
        return 0
    print(f"✗ {len(reporte.errores)} error(es). Este feed NO debe publicarse.")
    return 1


def _exportar(args: argparse.Namespace) -> int:
    """Exporta un extracto del feed a JSON para el prototipo.

    Deliberadamente acotado a unos pocos recorridos: el objetivo es que el
    prototipo muestre paraderos y trazados reales, no replicar la base de datos.
    """
    feed = leer_feed(args.feed)

    elegidos = args.recorridos or [r.nombre_corto for r in list(feed.recorridos.values())[:3]]
    por_nombre = {r.nombre_corto: r for r in feed.recorridos.values()}

    salida: dict[str, object] = {"recorridos": [], "paradas": {}}
    faltantes = []

    for nombre in elegidos:
        recorrido = por_nombre.get(nombre)
        if recorrido is None:
            faltantes.append(nombre)
            continue

        viaje = next(
            (v for v in feed.viajes.values()
             if v.recorrido_id == recorrido.id and v.trazado_id in feed.trazados),
            None,
        )
        if viaje is None:
            faltantes.append(nombre)
            continue

        ubicadas = ubicar_paradas(feed, viaje.id)
        trazado = feed.trazados[viaje.trazado_id]

        for u in ubicadas:
            p = feed.paradas[u.parada_id]
            salida["paradas"][p.id] = {
                "codigo": p.codigo, "nombre": p.nombre, "lat": p.lat, "lon": p.lon,
            }

        salida["recorridos"].append({
            "nombre": recorrido.nombre_corto,
            "destino": viaje.letrero,
            "largo_m": round(largo_m(trazado)),
            "trazado": [[round(la, 5), round(lo, 5)] for la, lo in trazado],
            "paradas": [
                {"id": u.parada_id, "orden": u.orden,
                 "distancia_m": round(u.distancia_recorrida)}
                for u in ubicadas
            ],
        })

    destino = Path(args.destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(salida, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Exportados {len(salida['recorridos'])} recorridos y "
          f"{len(salida['paradas'])} paradas a {destino}")
    if faltantes:
        print(f"No encontrados (o sin trazado): {', '.join(faltantes)}", file=sys.stderr)
    return 0


def _paraderos(args: argparse.Namespace) -> int:
    """Exporta paraderos cercanos a un punto, con los recorridos que los sirven.

    Es lo que consume la app mientras no exista el backend: paraderos, nombres,
    códigos y líneas reales, con los tiempos todavía simulados.
    """
    from collections import defaultdict

    from .geo import distancia_m

    feed = leer_feed(args.feed)
    centro = tuple(float(x) for x in args.centro.split(","))
    if len(centro) != 2:
        print("El centro debe ser 'lat,lon'", file=sys.stderr)
        return 1

    # Se toman más candidatos de los pedidos porque hay que descartar los que no
    # sirven ningún recorrido: el feed incluye estaciones "padre" de Metro y
    # accesos peatonales (de pathways.txt) que son puntos del mapa, no paraderos.
    cercanos = sorted(
        ((distancia_m(centro, p.punto), p) for p in feed.paradas.values()),
        key=lambda t: t[0],
    )[: args.cantidad * 8]
    ids = {p.id for _, p in cercanos}

    # Qué recorridos sirven cada uno de esos paraderos.
    recorridos_de = defaultdict(set)
    for viaje in feed.viajes.values():
        recorrido = feed.recorridos.get(viaje.recorrido_id)
        if recorrido is None:
            continue
        for paso in feed.pasos_por_viaje(viaje.id):
            if paso.parada_id in ids:
                recorridos_de[paso.parada_id].add((recorrido.nombre_corto, viaje.letrero))

    salida = []
    for metros, parada in cercanos:
        if len(salida) >= args.cantidad:
            break
        # Un recorrido puede aparecer con varios letreros (sentidos, variantes).
        # En pantalla interesa una entrada por línea, no una por letrero.
        por_linea: dict[str, str] = {}
        for nombre_linea, letrero in sorted(recorridos_de.get(parada.id, set())):
            por_linea.setdefault(nombre_linea, letrero)
        lineas = list(por_linea.items())
        if not lineas:
            continue  # estación padre o acceso peatonal, no un paradero
        salida.append({
            "id": parada.id,
            "codigo": parada.codigo,
            "nombre": parada.nombre,
            "lat": round(parada.lat, 5),
            "lon": round(parada.lon, 5),
            "distanciaM": round(metros),
            "recorridos": [
                {"nombre": n, "destino": d} for n, d in lineas[: args.max_recorridos]
            ],
        })

    destino = Path(args.destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        json.dumps({"paraderos": salida}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Exportados {len(salida)} paraderos a {destino}")
    for p in salida:
        print(f"  {p['codigo']:8} {p['distanciaM']:>5} m  {len(p['recorridos']):>2} líneas  {p['nombre'][:44]}")
    return 0


def _cargar(args: argparse.Namespace) -> int:
    from .load import cargar

    feed = leer_feed(args.feed)
    reporte = validar(feed)
    if not reporte.apto_para_produccion and not args.forzar:
        print(reporte)
        print("\n✗ El feed tiene errores. Usa --forzar si quieres cargarlo igual.",
              file=sys.stderr)
        return 1

    print(f"Cargando: {feed.resumen()}")
    conteos = cargar(feed, args.dsn, esquema=args.esquema)
    for tabla, n in conteos.items():
        print(f"  {tabla:12} {n:>8} filas")
    print("✓ Carga completa.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="gtfs", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="comando", required=True)

    p = sub.add_parser("descargar", help="baja el feed oficial")
    p.add_argument("--destino", default="data/GTFS.zip")
    p.add_argument("--url", default=URL_GTFS)
    p.set_defaults(fn=_descargar)

    p = sub.add_parser("resumen", help="qué trae el feed")
    p.add_argument("feed")
    p.set_defaults(fn=_resumen)

    p = sub.add_parser("validar", help="revisa si el feed sirve para este producto")
    p.add_argument("feed")
    p.add_argument("--muestra", type=int, default=200,
                   help="viajes a revisar en las comprobaciones geométricas")
    p.set_defaults(fn=_validar)

    p = sub.add_parser("exportar", help="extracto en JSON para el prototipo")
    p.add_argument("feed")
    p.add_argument("--destino", default="../prototipo/datos.json")
    p.add_argument("--recorridos", nargs="*", help="nombres, ej: 506 D09 210")
    p.set_defaults(fn=_exportar)

    p = sub.add_parser("paraderos", help="paraderos cercanos a un punto, para la app")
    p.add_argument("feed")
    p.add_argument("--centro", required=True, help="lat,lon")
    p.add_argument("--cantidad", type=int, default=6)
    p.add_argument("--max-recorridos", type=int, default=6)
    p.add_argument("--destino", default="../movil/src/paraderos.json")
    p.set_defaults(fn=_paraderos)

    p = sub.add_parser("cargar", help="carga el feed a PostGIS")
    p.add_argument("feed")
    p.add_argument("--dsn", required=True)
    p.add_argument("--esquema", default="gtfs")
    p.add_argument("--forzar", action="store_true")
    p.set_defaults(fn=_cargar)

    args = parser.parse_args(argv)
    try:
        return args.fn(args)
    except (FileNotFoundError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
