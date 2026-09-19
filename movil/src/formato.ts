/** Presentación de tiempos y estados. */

import type { Confianza, Estado, Fuente, Llegada } from "./tipos";

/** Minutos redondeados hacia abajo: «llega en 4» es mejor que «en 4,7». */
export function aMinutos(segundos: number): number {
  return Math.max(0, Math.floor(segundos / 60));
}

/** El número grande. `null` cuando no hay nada honesto que mostrar. */
export function etaTexto(llegada: Llegada): string {
  if (llegada.estado === "no_llegara") return "✕";
  if (llegada.etaSegundos === null) return "—";
  const min = aMinutos(llegada.etaSegundos);
  const prefijo = llegada.confianza === "baja" ? "~" : "";
  return min <= 0 ? "Llegando" : `${prefijo}${min}`;
}

/**
 * El rango, debajo del número.
 *
 * Es la pieza que hace honesta la estimación: «4 min» promete una precisión que
 * el sistema no tiene, «3–6 min» dice la verdad.
 */
export function rangoTexto(llegada: Llegada): string {
  if (llegada.estado === "no_llegara") return "desviada";
  if (!llegada.rangoSegundos) return "sin información";
  const [min, max] = llegada.rangoSegundos;
  return `${aMinutos(min)}–${aMinutos(max)} min`;
}

/** Explica de dónde viene la confianza. La transparencia es lo que la sostiene. */
export function origenTexto(llegada: Llegada): string {
  switch (llegada.estado) {
    case "no_llegara":
      return "✕ No pasa por aquí";
    case "probable_desvio":
      return "▲ Desvío probable";
    case "discrepancia":
      return "▲ Fuentes no coinciden";
    default:
      break;
  }
  if (llegada.fuente === "horario") return "Estimado · sin datos en vivo";
  if (llegada.personasABordo) {
    const n = llegada.personasABordo;
    return `● En vivo · ${n} ${n === 1 ? "persona" : "personas"} a bordo`;
  }
  return "● En vivo";
}

export type Tono = "ok" | "aviso" | "malo" | "neutro";

export function tono(estado: Estado, confianza: Confianza): Tono {
  if (estado === "no_llegara" || estado === "probable_desvio") return "malo";
  if (estado === "discrepancia") return "aviso";
  if (confianza === "alta" || confianza === "media") return "ok";
  return "neutro";
}
