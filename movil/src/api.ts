/**
 * Acceso a datos.
 *
 * Los **paraderos, códigos, nombres, coordenadas y recorridos son reales**:
 * salen del feed GTFS del DTPM, extraídos con
 * `backend/gtfs/cli.py paraderos`. Lo único simulado son los tiempos de
 * llegada, porque para eso hace falta el backend con datos en vivo.
 *
 * Cuando el backend esté en pie sólo cambia `USAR_DATOS_SIMULADOS`: las
 * pantallas hablan con esta capa y no con la red, así que no se enteran.
 */

import crudos from "./paraderos.json";
import type { Aviso, Llegada, Paradero, RespuestaParadero } from "./tipos";

/** Cambia esto cuando el backend esté desplegado. */
export const USAR_DATOS_SIMULADOS = true;
export const URL_BASE = "http://localhost:8000/v1";

interface ParaderoCrudo {
  id: string;
  codigo: string;
  nombre: string;
  lat: number;
  lon: number;
  distanciaM: number;
  recorridos: { nombre: string; destino: string }[];
}

const CRUDOS = crudos.paraderos as ParaderoCrudo[];

const PARADEROS: Paradero[] = CRUDOS.map((p) => ({
  id: p.id,
  codigo: p.codigo,
  nombre: p.nombre,
  distanciaM: p.distanciaM,
  recorridos: p.recorridos.map((r) => r.nombre),
}));

/* -------------------------------------------------------------------------- */
/* Simulación de llegadas                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Escenarios del motor (`docs/04` §4.4). Se reparten entre los paraderos para
 * poder ver los cuatro estados sin backend.
 */
type Escenario = "normal" | "sin_telemetria" | "discrepancia" | "no_llegara";

const ESCENARIOS: Escenario[] = [
  "no_llegara",
  "normal",
  "normal",
  "discrepancia",
  "sin_telemetria",
  "normal",
];

/** Generador determinista: el mismo paradero muestra siempre lo mismo. */
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

function entre(azar: () => number, min: number, max: number): number {
  return Math.round(min + azar() * (max - min));
}

function llegadaNormal(
  azar: () => number,
  ruta: { nombre: string; destino: string },
  indice: number,
): Llegada {
  const eta = entre(azar, 120, 300) + indice * entre(azar, 240, 420);
  const holgura = Math.round(eta * 0.18) + 40;
  const aBordo = entre(azar, 1, 5);
  return {
    recorrido: ruta.nombre,
    destino: ruta.destino,
    etaSegundos: eta,
    rangoSegundos: [Math.max(0, eta - holgura), eta + holgura],
    confianza: aBordo >= 3 ? "alta" : "media",
    fuente: "telemetria",
    estado: "en_ruta",
    personasABordo: aBordo,
  };
}

function llegadaSinTelemetria(
  azar: () => number,
  ruta: { nombre: string; destino: string },
  indice: number,
): Llegada {
  const eta = entre(azar, 180, 420) + indice * entre(azar, 300, 600);
  // Sin telemetría el rango se ensancha mucho: es lo honesto.
  const holgura = Math.round(eta * 0.55);
  return {
    recorrido: ruta.nombre,
    destino: ruta.destino,
    etaSegundos: eta,
    rangoSegundos: [Math.max(0, eta - holgura), eta + holgura],
    confianza: "baja",
    fuente: "horario",
    estado: "sin_telemetria",
  };
}

/**
 * Códigos de paradero de superficie: PA215, PD410, PI814…
 *
 * El feed mezcla paraderos de micro con andenes y accesos de Metro, cuyos
 * identificadores son internos (`LM_L1_V1`, `LM:C`). Mandar a alguien a un
 * código que no está escrito en ningún poste de la calle no sirve de nada.
 */
const CODIGO_DE_PARADERO = /^P[A-Z]\d+$/;

/** Busca una alternativa real: otro paradero de micro cercano y una línea que pasa. */
function alternativaReal(paraderoId: string): string | undefined {
  const otro = CRUDOS.find(
    (p) =>
      p.id !== paraderoId &&
      p.recorridos.length > 0 &&
      CODIGO_DE_PARADERO.test(p.codigo),
  );
  if (!otro) return undefined;
  const linea = otro.recorridos[0];
  return `Camina ${otro.distanciaM} m al paradero ${otro.codigo} y toma la ${linea.nombre} — va a ${linea.destino}.`;
}

function construir(p: ParaderoCrudo, escenario: Escenario): RespuestaParadero {
  const azar = semilla(p.id);
  const rutas = p.recorridos;
  const llegadas: Llegada[] = [];
  let aviso: Aviso | undefined;

  rutas.forEach((ruta, i) => {
    if (escenario === "no_llegara" && i === 0) {
      llegadas.push({
        recorrido: ruta.nombre,
        destino: ruta.destino,
        etaSegundos: null,
        rangoSegundos: null,
        confianza: "alta",
        fuente: "telemetria",
        estado: "no_llegara",
        via: "Desvío confirmado hace 12 min",
      });
      aviso = {
        nivel: "critico",
        titulo: `La ${ruta.nombre} no va a pasar por este paradero`,
        cuerpo:
          "Los buses de esta línea se desviaron hace 12 minutos. Ninguno se está acercando.",
        alternativa: alternativaReal(p.id),
      };
      return;
    }

    if (escenario === "discrepancia" && i === 0) {
      const eta = entre(azar, 120, 200);
      llegadas.push({
        recorrido: ruta.nombre,
        destino: ruta.destino,
        etaSegundos: eta,
        rangoSegundos: [eta, eta * 5],
        confianza: "baja",
        fuente: "gps_oficial",
        estado: "discrepancia",
      });
      aviso = {
        nivel: "advertencia",
        titulo: `La ${ruta.nombre} podría demorar más de lo anunciado`,
        cuerpo:
          "El dato oficial y la posición real de los buses no coinciden. Estamos verificando.",
      };
      return;
    }

    // Las últimas líneas de la lista suelen quedar sin telemetría: son las de
    // menor frecuencia, y es realista que nadie de la app vaya arriba.
    const sinDatos = escenario === "sin_telemetria" || i >= 3;
    llegadas.push(
      sinDatos ? llegadaSinTelemetria(azar, ruta, i) : llegadaNormal(azar, ruta, i),
    );
  });

  // La línea que no va a llegar va PRIMERO, no al final.
  //
  // Ordenar sólo por ETA la mandaba al fondo de la lista, porque no tiene ETA.
  // Pero es justamente la respuesta que la persona vino a buscar: está parada
  // esperando esa micro. Enterrarla bajo cinco líneas que sí vienen es fallar en
  // lo único que hace distinto a este producto.
  const prioridad = (l: Llegada) => (l.estado === "no_llegara" ? 0 : 1);
  llegadas.sort(
    (a, b) =>
      prioridad(a) - prioridad(b) ||
      (a.etaSegundos ?? Infinity) - (b.etaSegundos ?? Infinity),
  );

  return {
    paraderoId: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    actualizadoHace: entre(azar, 3, 40),
    aviso,
    llegadas,
  };
}

/* -------------------------------------------------------------------------- */
/* API                                                                        */
/* -------------------------------------------------------------------------- */

function demora<T>(valor: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), ms));
}

export async function paraderosCercanos(): Promise<Paradero[]> {
  if (USAR_DATOS_SIMULADOS) return demora(PARADEROS);
  const r = await fetch(`${URL_BASE}/stops/nearby`);
  if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
  return r.json();
}

export async function llegadasDeParadero(id: string): Promise<RespuestaParadero> {
  if (USAR_DATOS_SIMULADOS) {
    const indice = CRUDOS.findIndex((p) => p.id === id);
    if (indice < 0) throw new Error("No encontramos ese paradero");
    return demora(construir(CRUDOS[indice], ESCENARIOS[indice % ESCENARIOS.length]));
  }
  const r = await fetch(`${URL_BASE}/stops/${id}/arrivals`);
  if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
  return r.json();
}
