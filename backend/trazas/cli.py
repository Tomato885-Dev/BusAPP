"""Línea de comandos del análisis de trazas.

    cd backend && python -m trazas.cli analizar ../datos-terreno/*.gpx
    cd backend && python -m trazas.cli simular --recorrido 506
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from gtfs.parse import leer_feed
from . import emparejar as emp
from . import simular as sim
from .gpx import Traza, leer
from .segmentar import Tipo, segmentar

FEED_POR_OMISION = "data/GTFS.zip"


def _cargar_indice(ruta_feed: str) -> emp.IndiceGlobal:
    print(f"Leyendo {ruta_feed} …", file=sys.stderr)
    feed = leer_feed(ruta_feed)
    print(f"  {feed.resumen()}", file=sys.stderr)
    candidatos = emp.candidatos_del_feed(feed)
    print(f"  {len(candidatos)} recorridos con sentido y trazado", file=sys.stderr)
    return emp.IndiceGlobal(candidatos)


def _mostrar(traza: Traza, indice: emp.IndiceGlobal, *, detalle: bool) -> None:
    print(f"\n━━ {traza.nombre}")
    print(f"   {traza.resumen()}")

    tramos = segmentar(traza)
    for t in tramos:
        print(
            f"   · {t.tipo.value:10s} {t.duracion_s / 60:5.1f} min "
            f"{t.largo_m / 1000:6.2f} km  {t.velocidad_media_ms * 3.6:5.1f} km/h"
        )

    resultados = emp.analizar(traza, indice)
    if not resultados:
        print("   → No se detectó ningún tramo a bordo de un vehículo.")
        return

    for r in resultados:
        marca = "✓" if r.concluyente else "?"
        print(f"   {marca} {r.explicacion()}")
        if not detalle:
            continue
        for p in r.puntajes[:5]:
            print(
                f"       {p.total:.3f}  {p.candidato.nombre:>6s} "
                f"cob {p.cobertura:.2f}  avance {p.avance:.2f}  "
                f"paradas {p.paradas:.2f} ({p.paradas_vistas}/{p.paradas_posibles} de {p.detenciones_observadas})  "
                f"desv {p.desviacion_mediana:5.1f} m"
            )


def _analizar(args: argparse.Namespace) -> int:
    indice = _cargar_indice(args.feed)
    for ruta in args.archivos:
        try:
            traza = leer(ruta)
        except (ValueError, OSError) as e:
            print(f"\n━━ {Path(ruta).name}\n   ✗ {e}")
            continue
        _mostrar(traza, indice, detalle=args.detalle)
    return 0


def _simular(args: argparse.Namespace) -> int:
    indice = _cargar_indice(args.feed)
    elegidos = [
        c for c in indice.candidatos
        if args.recorrido is None or c.nombre == args.recorrido
    ]
    if not elegidos:
        print(f"No hay ningún recorrido llamado {args.recorrido!r}", file=sys.stderr)
        return 1
    candidato = elegidos[0]
    print(f"Simulando sobre {candidato.nombre} → {candidato.letrero}", file=sys.stderr)

    casos = {
        "micro": sim.viaje_en_micro(candidato),
        "auto": sim.viaje_en_auto(candidato),
        "metro": sim.viaje_en_metro(candidato),
    }
    for nombre, traza in casos.items():
        if args.guardar_en:
            destino = Path(args.guardar_en) / f"simulado-{nombre}-{candidato.nombre}.gpx"
            destino.write_text(sim.a_gpx(traza), encoding="utf-8")
            print(f"escrito {destino}", file=sys.stderr)
        _mostrar(traza, indice, detalle=args.detalle)
    return 0


def _medir(args: argparse.Namespace) -> int:
    """Mide sobre toda la red cuántas veces se acierta el recorrido.

    Es el número que responde el riesgo R2b de `docs/06`, y está acá como orden
    y no como resultado pegado en un documento: así se vuelve a medir cuando
    cambie el algoritmo o el feed, en vez de arrastrar una cifra vieja.
    """
    import random
    from collections import Counter

    indice = _cargar_indice(args.feed)
    utiles = [c for c in indice.candidatos if len(c.paradas) >= 15]
    azar = random.Random(args.semilla)
    muestra = azar.sample(utiles, min(args.muestra, len(utiles)))

    exactos = en_grupo = concluyentes = 0
    tamanos: Counter[int] = Counter()
    fuera: list[str] = []

    for k, c in enumerate(muestra):
        traza = sim.viaje_en_micro(
            c, paraderos=args.paraderos, con_caminatas=False, semilla=k
        )
        r = emp.emparejar(traza, indice)
        if not r.puntajes:
            fuera.append(f"{c.nombre}: sin candidatos")
            continue
        tope = r.puntajes[0].total
        grupo = [p for p in r.puntajes if tope - p.total < emp.MARGEN_MINIMO]
        tamanos[len(grupo)] += 1
        if r.puntajes[0].candidato.id == c.id:
            exactos += 1
        if any(p.candidato.id == c.id for p in grupo):
            en_grupo += 1
        else:
            fuera.append(f"{c.nombre}: ganó {r.puntajes[0].candidato.nombre}")
        if r.concluyente:
            concluyentes += 1

    n = len(muestra)
    print(f"\n{n} recorridos al azar · viaje de {args.paraderos} paraderos\n")
    print(f"  el correcto sale primero             {exactos:4d} / {n}  "
          f"({100 * exactos / n:.0f}%)")
    print(f"  el correcto está en el grupo         {en_grupo:4d} / {n}  "
          f"({100 * en_grupo / n:.0f}%)")
    print(f"  el sistema se atreve a responder     {concluyentes:4d} / {n}  "
          f"({100 * concluyentes / n:.0f}%)")
    print("\n  tamaño del grupo empatado:")
    for k in sorted(tamanos):
        print(f"    {k:2d}: {tamanos[k]:3d}  {'█' * tamanos[k]}")
    if fuera:
        print(f"\n  el correcto quedó fuera en {len(fuera)}:")
        for linea in fuera[:12]:
            print(f"    {linea}")
    print(
        "\n  Recordatorio: son trazas sintéticas hechas con los mismos trazados\n"
        "  contra los que se comparan. Esto es el mejor caso posible, no una\n"
        "  predicción de lo que va a pasar en la calle."
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="trazas", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--feed", default=FEED_POR_OMISION, help="ruta del GTFS")
    parser.add_argument("--detalle", action="store_true",
                        help="muestra los cinco mejores candidatos y sus señales")
    sub = parser.add_subparsers(dest="orden", required=True)

    p = sub.add_parser("analizar", help="analiza archivos .gpx grabados")
    p.add_argument("archivos", nargs="+")
    p.set_defaults(func=_analizar)

    p = sub.add_parser("medir", help="mide el acierto sobre toda la red")
    p.add_argument("--muestra", type=int, default=50)
    p.add_argument("--paraderos", type=int, default=10)
    p.add_argument("--semilla", type=int, default=3)
    p.set_defaults(func=_medir)

    p = sub.add_parser("simular", help="genera y analiza trazas sintéticas")
    p.add_argument("--recorrido", help="nombre corto, por ejemplo 506")
    p.add_argument("--guardar-en", help="carpeta donde escribir los .gpx generados")
    p.set_defaults(func=_simular)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
