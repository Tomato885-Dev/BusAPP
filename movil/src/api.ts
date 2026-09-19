/**
 * Llegadas de micro en un paradero.
 *
 * Los paraderos y recorridos son reales (feed del DTPM). **Los tiempos son
 * simulados**: para tenerlos de verdad hace falta el backend con el motor de
 * `docs/04`, que fusiona el dato oficial con la telemetría de los usuarios.
 *
 * La simulación no es relleno: reproduce los cuatro estados del motor, para
 * poder diseñar y discutir cómo se comunica cada uno antes de tener datos.
 */

import { recorridosDe, type Recorrido } from "./red";
import type { Aviso, Llegada, RespuestaParadero } from "./tipos";

export const USAR_DATOS_SIMULADOS = true;
export const URL_BASE = "http://localhost:8000/v1";

/** Generador determinista: un paradero muestra siempre lo mismo. */
function semilla(texto: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entre = (azar: () => number, min: number, max: number) =>
  Math.round(min + azar() * (max - min));

function conTelemetria(azar: () => number, r: Recorrido, eta: number): Llegada {
  const holgura = Math.round(eta * 0.16) + 30;
  const aBordo = entre(azar, 1, 5);
  return {
    recorrido: r.nombre,
    destino: r.destino,
    etaSegundos: eta,
    rangoSegundos: [Math.max(0, eta - holgura), eta + holgura],
    confianza: aBordo >= 3 ? "alta" : "media",
    fuente: "telemetria",
    estado: "en_ruta",
    personasABordo: aBordo,
  };
}

function soloHorario(azar: () => number, r: Recorrido, eta: number): Llegada {
  // Sin telemetría el rango se ensancha mucho. Es lo honesto.
  const holgura = Math.round(eta * 0.5);
  return {
    recorrido: r.nombre,
    destino: r.destino,
    etaSegundos: eta,
    rangoSegundos: [Math.max(0, eta - holgura), eta + holgura],
    confianza: "baja",
    fuente: "horario",
    estado: "sin_telemetria",
  };
}

export function llegadasDeParadero(paraderoId: string): RespuestaParadero {
  const azar = semilla(paraderoId);
  const recorridos = recorridosDe(paraderoId);

  // El escenario depende del paradero, para que se puedan ver los cuatro
  // estados recorriendo el mapa.
  const escenario = entre(azar, 0, 9);
  const hayDesvio = escenario === 0 && recorridos.length >= 2;
  const hayDiscrepancia = escenario === 1 && recorridos.length >= 2;

  let aviso: Aviso | undefined;
  const llegadas: Llegada[] = [];

  recorridos.forEach((r, i) => {
    const base = entre(azar, 90, 300) + i * entre(azar, 180, 420);

    if (hayDesvio && i === 0) {
      llegadas.push({
        recorrido: r.nombre,
        destino: r.destino,
        etaSegundos: null,
        rangoSegundos: null,
        confianza: "alta",
        fuente: "telemetria",
        estado: "no_llegara",
        via: "Desvío confirmado hace 12 min",
      });
      aviso = {
        nivel: "critico",
        titulo: `La ${r.nombre} no va a pasar por aquí`,
        cuerpo: "Se desvió hace 12 minutos y ningún bus de esta línea se está acercando.",
      };
      return;
    }

    if (hayDiscrepancia && i === 0) {
      llegadas.push({
        recorrido: r.nombre,
        destino: r.destino,
        etaSegundos: base,
        rangoSegundos: [base, base * 4],
        confianza: "baja",
        fuente: "gps_oficial",
        estado: "discrepancia",
      });
      aviso = {
        nivel: "advertencia",
        titulo: `La ${r.nombre} podría demorar más de lo anunciado`,
        cuerpo: "El dato oficial y la posición real de los buses no coinciden.",
      };
      return;
    }

    // Las líneas de menor frecuencia suelen quedar sin nadie a bordo.
    llegadas.push(i >= 3 ? soloHorario(azar, r, base) : conTelemetria(azar, r, base));
  });

  // De menor a mayor tiempo. Las que no van a llegar no tienen tiempo, así que
  // quedan al final; el aviso de arriba es lo que impide que pasen inadvertidas.
  llegadas.sort((a, b) => (a.etaSegundos ?? Infinity) - (b.etaSegundos ?? Infinity));

  return {
    paraderoId,
    actualizadoHace: entre(azar, 3, 45),
    aviso,
    llegadas,
  };
}
