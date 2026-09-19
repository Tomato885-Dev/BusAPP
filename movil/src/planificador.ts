/**
 * Planificación de viajes.
 *
 * Busca **viajes directos**: un recorrido que pase por un paradero cerca del
 * origen y después por uno cerca del destino. No resuelve todavía combinaciones
 * con transbordo.
 *
 * Es una limitación real y conviene decirla en pantalla en vez de esconderla.
 * Resolver transbordos bien es un problema difícil (RAPTOR, CSA) y la decisión
 * tomada en `docs/03-arquitectura.md` §3.5 es no reimplementarlo: eso lo hará
 * OpenTripPlanner en el backend. Esto cubre el caso más frecuente mientras
 * tanto, sin servidor.
 */

import { distanciaM } from "./mapa/proyeccion";
import {
  PARADERO_POR_ID,
  indicePorParadero,
  largoDeTramo,
  type Paradero,
  type Recorrido,
} from "./red";

/** Velocidad comercial de una micro en Santiago, incluyendo detenciones. */
const VELOCIDAD_MS = 16 / 3.6;
/** Velocidad de caminata. */
const CAMINATA_MS = 4.6 / 3.6;
/** Radio en que se considera que un paradero «sirve» a un punto. */
const RADIO_M = 650;

export interface Viaje {
  recorrido: Recorrido;
  subirEn: Paradero;
  bajarEn: Paradero;
  paradasIntermedias: number;
  caminataInicialM: number;
  caminataFinalM: number;
  segundosEnMicro: number;
  segundosCaminando: number;
  segundosTotales: number;
}

function paraderosCerca(punto: { lat: number; lon: number }): Map<string, number> {
  const cerca = new Map<string, number>();
  for (const [id] of indicePorParadero) {
    const p = PARADERO_POR_ID.get(id);
    if (!p) continue;
    const d = distanciaM(punto, p);
    if (d <= RADIO_M) cerca.set(id, d);
  }
  return cerca;
}

export function planificar(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number },
  limite = 6,
): Viaje[] {
  const cercaOrigen = paraderosCerca(origen);
  const cercaDestino = paraderosCerca(destino);
  if (cercaOrigen.size === 0 || cercaDestino.size === 0) return [];

  // Por cada recorrido, la mejor combinación de subida y bajada.
  const mejorPorRecorrido = new Map<string, Viaje>();

  for (const [paraderoId, caminataInicialM] of cercaOrigen) {
    for (const { recorrido, orden } of indicePorParadero.get(paraderoId) ?? []) {
      for (let i = orden + 1; i < recorrido.paradas.length; i++) {
        const caminataFinalM = cercaDestino.get(recorrido.paradas[i]);
        if (caminataFinalM === undefined) continue;

        const subirEn = PARADERO_POR_ID.get(paraderoId);
        const bajarEn = PARADERO_POR_ID.get(recorrido.paradas[i]);
        if (!subirEn || !bajarEn) continue;

        const segundosEnMicro = largoDeTramo(recorrido, orden, i) / VELOCIDAD_MS;
        const segundosCaminando = (caminataInicialM + caminataFinalM) / CAMINATA_MS;
        const viaje: Viaje = {
          recorrido,
          subirEn,
          bajarEn,
          paradasIntermedias: i - orden,
          caminataInicialM: Math.round(caminataInicialM),
          caminataFinalM: Math.round(caminataFinalM),
          segundosEnMicro: Math.round(segundosEnMicro),
          segundosCaminando: Math.round(segundosCaminando),
          segundosTotales: Math.round(segundosEnMicro + segundosCaminando),
        };

        const previo = mejorPorRecorrido.get(recorrido.id);
        if (!previo || viaje.segundosTotales < previo.segundosTotales) {
          mejorPorRecorrido.set(recorrido.id, viaje);
        }
      }
    }
  }

  return [...mejorPorRecorrido.values()]
    .sort((a, b) => a.segundosTotales - b.segundosTotales)
    .slice(0, limite);
}
