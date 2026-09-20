/**
 * Llegadas de micro en un paradero.
 *
 * **Los intervalos entre buses son reales**: salen de `frequencies.txt` del feed
 * del DTPM, que declara cada cuántos minutos pasa cada recorrido en cada franja
 * horaria. La red de Santiago opera por frecuencia, no por horario fijo.
 *
 * Lo que **no** es real es saber cuándo viene *el próximo*. Para eso hace falta
 * el motor de `docs/04`, que fusiona el dato oficial con la telemetría de los
 * usuarios. Mientras tanto:
 *
 * - Sin telemetría, la espera se modela como lo que estadísticamente es: si
 *   llegas al paradero en un momento cualquiera y los buses pasan cada 12
 *   minutos, esperas entre 0 y 12, en promedio 6. El rango ancho no es un
 *   defecto, es la verdad.
 * - Con telemetría (hoy simulada), la estimación se estrecha. Esa diferencia
 *   es exactamente lo que el producto viene a aportar.
 */

import { intervaloOficial, recorridosDe, type Recorrido } from "./red";
import type { Aviso, Llegada, RespuestaParadero } from "./tipos";

export const USAR_DATOS_SIMULADOS = true;

/**
 * Si los tiempos que se muestran son una demostración.
 *
 * **Lo que es real:** cada cuántos minutos pasa cada recorrido, que sale de
 * `frequencies.txt` del DTPM, y los horarios de operación.
 *
 * **Lo que no:** cuándo viene *el próximo* bus. Para eso hace falta la posición
 * en vivo, que hoy no existe: ni el acceso al GPS oficial ni la telemetría de
 * usuarios. Mientras tanto la app simula esa capa para poder diseñarla y
 * mostrarla, y lo dice en pantalla donde aparecen los números. Un tiempo
 * inventado presentado como real es exactamente lo que Kupay existe para
 * corregir.
 */
export const MODO_DEMO = USAR_DATOS_SIMULADOS;
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

function minutos(segundos: number): string {
  return `${Math.round(segundos / 60)}`;
}

/** Sin datos en vivo: sólo se sabe la frecuencia oficial. */
function porFrecuencia(r: Recorrido, intervalo: number): Llegada {
  return {
    recorrido: r.nombre,
    destino: r.destino,
    etaSegundos: Math.round(intervalo / 2),
    rangoSegundos: [0, intervalo],
    confianza: "baja",
    fuente: "horario",
    estado: "sin_telemetria",
    via: `Cada ${minutos(intervalo)} min · horario oficial`,
  };
}

/** Con alguien a bordo: la estimación se estrecha sobre el intervalo real. */
function conTelemetria(azar: () => number, r: Recorrido, intervalo: number): Llegada {
  const eta = entre(azar, 60, Math.max(120, intervalo));
  const holgura = Math.round(eta * 0.15) + 30;
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
    via: `Cada ${minutos(intervalo)} min · horario oficial`,
  };
}

export function llegadasDeParadero(paraderoId: string, ahora = new Date()): RespuestaParadero {
  const azar = semilla(paraderoId + ahora.getHours());
  const recorridos = recorridosDe(paraderoId);

  // El escenario depende del paradero, para que recorriendo el mapa se vean
  // los cuatro estados del motor.
  const escenario = entre(azar, 0, 9);
  const hayDesvio = escenario === 0 && recorridos.length >= 2;
  const hayDiscrepancia = escenario === 1 && recorridos.length >= 2;

  let aviso: Aviso | undefined;
  const llegadas: Llegada[] = [];

  recorridos.forEach((r, i) => {
    const intervalo = intervaloOficial(r, ahora);

    if (intervalo === null) {
      // Fuera del horario de operación declarado para este recorrido.
      llegadas.push({
        recorrido: r.nombre,
        destino: r.destino,
        etaSegundos: null,
        rangoSegundos: null,
        confianza: "sin_datos",
        fuente: "horario",
        estado: "sin_telemetria",
        via: "Fuera de horario",
      });
      return;
    }

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
      const eta = entre(azar, 120, 240);
      llegadas.push({
        recorrido: r.nombre,
        destino: r.destino,
        etaSegundos: eta,
        rangoSegundos: [eta, intervalo],
        confianza: "baja",
        fuente: "gps_oficial",
        estado: "discrepancia",
        via: `Cada ${minutos(intervalo)} min · horario oficial`,
      });
      aviso = {
        nivel: "advertencia",
        titulo: `La ${r.nombre} podría demorar más de lo anunciado`,
        cuerpo: "El dato oficial y la posición real de los buses no coinciden.",
      };
      return;
    }

    // Las líneas de menor frecuencia suelen quedar sin nadie a bordo.
    llegadas.push(i >= 3 ? porFrecuencia(r, intervalo) : conTelemetria(azar, r, intervalo));
  });

  // De menor a mayor tiempo. Las que no tienen tiempo quedan al final; el aviso
  // de arriba es lo que impide que pasen inadvertidas.
  llegadas.sort((a, b) => (a.etaSegundos ?? Infinity) - (b.etaSegundos ?? Infinity));

  return {
    paraderoId,
    actualizadoHace: entre(azar, 3, 45),
    aviso,
    llegadas,
  };
}
