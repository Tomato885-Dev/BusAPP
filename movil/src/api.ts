/**
 * Acceso a datos.
 *
 * Hoy devuelve datos simulados. Cuando el backend esté en pie sólo cambia la
 * implementación de estas dos funciones: las pantallas no se enteran, porque
 * hablan con esta capa y no con la red.
 *
 * Los datos simulados no son adorno: reproducen los cuatro escenarios del motor
 * (`docs/04` §4.4) para poder ver la interfaz en cada estado sin backend.
 */

import type { Paradero, RespuestaParadero } from "./tipos";

/** Cambia esto cuando el backend esté desplegado. */
export const USAR_DATOS_SIMULADOS = true;
export const URL_BASE = "http://localhost:8000/v1";

const PARADEROS: Paradero[] = [
  { id: "S4", codigo: "PA420", nombre: "Parada 5 / Av. Grecia", distanciaM: 80, recorridos: ["506", "D09", "210"] },
  { id: "N1", codigo: "PA433", nombre: "Irarrázaval / Pedro de Valdivia", distanciaM: 240, recorridos: ["D09", "513", "346"] },
  { id: "S3", codigo: "PA415", nombre: "Av. Grecia / Tobalaba", distanciaM: 410, recorridos: ["506", "D09"] },
  { id: "S5", codigo: "PA425", nombre: "Av. Grecia / Chile España", distanciaM: 620, recorridos: ["506", "226"] },
];

/**
 * Escenarios del motor. Se rotan por paradero para que al navegar se vean
 * todos los estados; con backend real esto lo decide el servidor.
 */
const ESCENARIOS: Record<string, Omit<RespuestaParadero, "paraderoId" | "codigo" | "nombre">> = {
  S4: {
    actualizadoHace: 8,
    aviso: {
      nivel: "critico",
      titulo: "La 506 no va a pasar por este paradero",
      cuerpo: "Los buses de esta línea se desviaron hace 12 minutos por un corte en Av. Grecia.",
      alternativa: "Camina 2 cuadras al paradero PA433 y toma la D09 — llega en 6 min.",
    },
    llegadas: [
      { recorrido: "506", destino: "Peñalolén", etaSegundos: null, rangoSegundos: null,
        confianza: "alta", fuente: "telemetria", estado: "no_llegara", via: "Desvío confirmado · 12 min" },
      { recorrido: "D09", destino: "Estación Central", etaSegundos: 380, rangoSegundos: [300, 480],
        confianza: "alta", fuente: "telemetria", estado: "en_ruta", personasABordo: 4, via: "Vía Irarrázaval" },
      { recorrido: "210", destino: "Recoleta", etaSegundos: 960, rangoSegundos: [720, 1260],
        confianza: "baja", fuente: "horario", estado: "sin_telemetria", via: "Vía Vicuña Mackenna" },
    ],
  },
  N1: {
    actualizadoHace: 4,
    llegadas: [
      { recorrido: "D09", destino: "Providencia", etaSegundos: 240, rangoSegundos: [180, 360],
        confianza: "alta", fuente: "telemetria", estado: "en_ruta", personasABordo: 3, via: "Vía Irarrázaval" },
      { recorrido: "513", destino: "Las Condes", etaSegundos: 540, rangoSegundos: [420, 720],
        confianza: "media", fuente: "telemetria", estado: "en_ruta", personasABordo: 1, via: "Vía Tobalaba" },
      { recorrido: "346", destino: "La Reina", etaSegundos: 1020, rangoSegundos: [780, 1320],
        confianza: "baja", fuente: "horario", estado: "sin_telemetria" },
    ],
  },
  S3: {
    actualizadoHace: 12,
    aviso: {
      nivel: "advertencia",
      titulo: "La 506 podría demorar más de lo anunciado",
      cuerpo: "El dato oficial y la posición real de los buses no coinciden. Estamos verificando.",
    },
    llegadas: [
      { recorrido: "506", destino: "Peñalolén", etaSegundos: 180, rangoSegundos: [180, 900],
        confianza: "baja", fuente: "gps_oficial", estado: "discrepancia", via: "Vía Grecia" },
      { recorrido: "D09", destino: "Providencia", etaSegundos: 500, rangoSegundos: [420, 660],
        confianza: "alta", fuente: "telemetria", estado: "en_ruta", personasABordo: 2 },
    ],
  },
  S5: {
    actualizadoHace: 31,
    llegadas: [
      { recorrido: "506", destino: "Peñalolén", etaSegundos: 420, rangoSegundos: [240, 840],
        confianza: "baja", fuente: "horario", estado: "sin_telemetria", via: "Vía Grecia" },
      { recorrido: "226", destino: "Macul", etaSegundos: null, rangoSegundos: null,
        confianza: "sin_datos", fuente: "horario", estado: "sin_telemetria" },
    ],
  },
};

function demora<T>(valor: T, ms = 350): Promise<T> {
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
    const paradero = PARADEROS.find((p) => p.id === id);
    const escenario = ESCENARIOS[id];
    if (!paradero || !escenario) throw new Error("No encontramos ese paradero");
    return demora({
      paraderoId: paradero.id,
      codigo: paradero.codigo,
      nombre: paradero.nombre,
      ...escenario,
    });
  }
  const r = await fetch(`${URL_BASE}/stops/${id}/arrivals`);
  if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
  return r.json();
}
