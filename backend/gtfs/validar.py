"""Validación de un feed GTFS.

No valida la especificación completa —para eso existen herramientas dedicadas—
sino **lo que este producto necesita para funcionar**. Un feed puede ser
formalmente válido y aun así inservible aquí: por ejemplo, si ningún viaje trae
trazado, el motor de estimación no existe.

Se ejecuta con cada actualización del feed, y un hallazgo de nivel ``ERROR``
debe impedir que ese feed entre a producción.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from .geo import largo_m
from .parse import Feed
from .posiciones import ubicar_paradas


class Nivel(Enum):
    ERROR = "ERROR"      # el feed no sirve; no publicar
    AVISO = "AVISO"      # funciona, pero degradado
    INFO = "INFO"        # dato de contexto


@dataclass
class Hallazgo:
    nivel: Nivel
    mensaje: str
    detalle: str = ""

    def __str__(self) -> str:
        base = f"[{self.nivel.value}] {self.mensaje}"
        return f"{base}\n         {self.detalle}" if self.detalle else base


@dataclass
class Reporte:
    hallazgos: list[Hallazgo] = field(default_factory=list)

    def agregar(self, nivel: Nivel, mensaje: str, detalle: str = "") -> None:
        self.hallazgos.append(Hallazgo(nivel, mensaje, detalle))

    @property
    def errores(self) -> list[Hallazgo]:
        return [h for h in self.hallazgos if h.nivel is Nivel.ERROR]

    @property
    def apto_para_produccion(self) -> bool:
        return not self.errores

    def __str__(self) -> str:
        if not self.hallazgos:
            return "Sin hallazgos."
        return "\n".join(str(h) for h in self.hallazgos)


def validar(feed: Feed, *, muestra_viajes: int = 200) -> Reporte:
    """Valida un feed para uso en este producto.

    Args:
        feed: el feed ya leído.
        muestra_viajes: cuántos viajes revisar para las comprobaciones
            geométricas, que son caras. Una muestra basta para detectar
            problemas sistemáticos.
    """
    rep = Reporte()

    # --- contenido mínimo ---------------------------------------------------
    if not feed.paradas:
        rep.agregar(Nivel.ERROR, "El feed no tiene paradas")
    if not feed.recorridos:
        rep.agregar(Nivel.ERROR, "El feed no tiene recorridos")
    if not feed.viajes:
        rep.agregar(Nivel.ERROR, "El feed no tiene viajes")
    if not feed.pasos:
        rep.agregar(Nivel.ERROR, "El feed no tiene horarios (stop_times)")

    rep.agregar(Nivel.INFO, "Contenido del feed", feed.resumen())

    # --- integridad referencial --------------------------------------------
    viajes_huerfanos = [v.id for v in feed.viajes.values() if v.recorrido_id not in feed.recorridos]
    if viajes_huerfanos:
        rep.agregar(
            Nivel.ERROR,
            f"{len(viajes_huerfanos)} viajes apuntan a un recorrido inexistente",
            f"ejemplos: {', '.join(viajes_huerfanos[:5])}",
        )

    paradas_huerfanas = {p.parada_id for p in feed.pasos if p.parada_id not in feed.paradas}
    if paradas_huerfanas:
        rep.agregar(
            Nivel.ERROR,
            f"{len(paradas_huerfanas)} paradas referenciadas en horarios no existen",
            f"ejemplos: {', '.join(sorted(paradas_huerfanas)[:5])}",
        )

    # --- trazados: sin esto no hay motor de estimación ----------------------
    sin_trazado = [v.id for v in feed.viajes.values() if not v.trazado_id]
    if len(sin_trazado) == len(feed.viajes) and feed.viajes:
        rep.agregar(
            Nivel.ERROR,
            "Ningún viaje trae trazado (shape_id)",
            "Sin trazados no se puede calcular distancia por el recorrido, que es "
            "la base del motor de estimación (docs/04 §4.2).",
        )
    elif sin_trazado:
        rep.agregar(
            Nivel.AVISO,
            f"{len(sin_trazado)} de {len(feed.viajes)} viajes no traen trazado",
            "Esos recorridos sólo podrán estimar con horario programado.",
        )

    trazados_cortos = [tid for tid, t in feed.trazados.items() if len(t) < 2]
    if trazados_cortos:
        rep.agregar(
            Nivel.AVISO,
            f"{len(trazados_cortos)} trazados tienen menos de dos puntos",
            f"ejemplos: {', '.join(trazados_cortos[:5])}",
        )

    # --- coherencia geométrica (sobre una muestra) --------------------------
    revisados = 0
    con_paradas_lejanas = 0
    total_sospechosas = 0
    for viaje in feed.viajes.values():
        if revisados >= muestra_viajes:
            break
        if not viaje.trazado_id or viaje.trazado_id not in feed.trazados:
            continue
        if len(feed.trazados[viaje.trazado_id]) < 2:
            continue
        try:
            ubicadas = ubicar_paradas(feed, viaje.id)
        except (KeyError, ValueError):
            continue
        revisados += 1
        sospechosas = sum(1 for p in ubicadas if p.sospechosa)
        if sospechosas:
            con_paradas_lejanas += 1
            total_sospechosas += sospechosas

    if revisados:
        proporcion = con_paradas_lejanas / revisados
        detalle = (
            f"{con_paradas_lejanas} de {revisados} viajes revisados tienen alguna "
            f"parada a más de 100 m de su trazado ({total_sospechosas} paradas en total)."
        )
        if proporcion > 0.2:
            rep.agregar(Nivel.ERROR, "Muchas paradas no calzan con su trazado", detalle)
        elif con_paradas_lejanas:
            rep.agregar(Nivel.AVISO, "Algunas paradas no calzan con su trazado", detalle)
        else:
            rep.agregar(Nivel.INFO, "Geometría coherente", f"{revisados} viajes revisados, sin anomalías")

    # --- largos implausibles ------------------------------------------------
    implausibles = [
        tid for tid, t in feed.trazados.items()
        if len(t) >= 2 and not (500 <= largo_m(t) <= 120_000)
    ]
    if implausibles:
        rep.agregar(
            Nivel.AVISO,
            f"{len(implausibles)} trazados con largo implausible (<500 m o >120 km)",
            f"ejemplos: {', '.join(implausibles[:5])}",
        )

    return rep
