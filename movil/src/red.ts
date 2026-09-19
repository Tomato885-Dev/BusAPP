/**
 * La red de transporte, cargada del feed real del DTPM.
 *
 * `red.json` lo genera `backend/gtfs/cli.py zona`. Trae los paraderos de
 * superficie de Santiago centro-oriente con sus coordenadas reales, y los
 * recorridos con la secuencia ordenada de paradas que tocan.
 *
 * Esa secuencia es lo que permite planificar viajes sin servidor: si un
 * recorrido pasa por A y después por B, sirve para ir de A a B.
 */

import crudo from "./red.json";
import { distanciaM } from "./mapa/proyeccion";

export interface Paradero {
  id: string;
  codigo: string;
  nombre: string;
  lat: number;
  lon: number;
}

/** `[inicio, fin, intervalo]` en segundos desde medianoche. */
export type Franja = [number, number, number];

export interface Recorrido {
  id: string;
  nombre: string;
  destino: string;
  tipo: number; // 3 = bus, 1 = metro
  paradas: string[];
  /** Frecuencias oficiales del DTPM por franja horaria. */
  frecuencias: Franja[];
}

/**
 * Intervalo oficial entre buses de un recorrido a una hora dada, en segundos.
 *
 * La red de Santiago opera **por frecuencia**, no por horario fijo: el feed no
 * dice «la 506 pasa a las 14:07», dice «entre las 13:00 y las 18:00 pasa cada
 * 12 minutos». Es el dato real disponible mientras no exista el motor en vivo.
 *
 * Varias variantes de un mismo recorrido pueden declarar franjas que se
 * superponen; se toma la más frecuente, que es la que domina lo que el usuario
 * ve pasar por el paradero.
 */
export function intervaloOficial(recorrido: Recorrido, ahora = new Date()): number | null {
  const segundos = segundosEnSantiago(ahora);
  let mejor: number | null = null;
  for (const [inicio, fin, intervalo] of recorrido.frecuencias) {
    if (segundos < inicio || segundos >= fin) continue;
    if (mejor === null || intervalo < mejor) mejor = intervalo;
  }
  return mejor;
}

const datos = crudo as { paraderos: Paradero[]; recorridos: Recorrido[] };

export const PARADEROS: Paradero[] = datos.paraderos;
export const RECORRIDOS: Recorrido[] = datos.recorridos;

export const PARADERO_POR_ID = new Map(PARADEROS.map((p) => [p.id, p]));
export const RECORRIDO_POR_ID = new Map(RECORRIDOS.map((r) => [r.id, r]));

/** Qué recorridos sirven cada paradero, y en qué posición de su secuencia. */
const indicePorParadero = new Map<string, { recorrido: Recorrido; orden: number }[]>();
for (const recorrido of RECORRIDOS) {
  recorrido.paradas.forEach((paradaId, orden) => {
    const lista = indicePorParadero.get(paradaId);
    if (lista) lista.push({ recorrido, orden });
    else indicePorParadero.set(paradaId, [{ recorrido, orden }]);
  });
}

export function recorridosDe(paraderoId: string): Recorrido[] {
  const lista = indicePorParadero.get(paraderoId) ?? [];
  // Un recorrido puede tocar el mismo paradero dos veces (ida y vuelta).
  const vistos = new Set<string>();
  return lista
    .map((e) => e.recorrido)
    .filter((r) => (vistos.has(r.id) ? false : (vistos.add(r.id), true)));
}

export function paraderosCercaDe(
  punto: { lat: number; lon: number },
  radioM = 500,
  limite = 12,
): (Paradero & { distanciaM: number })[] {
  return PARADEROS.map((p) => ({ ...p, distanciaM: distanciaM(punto, p) }))
    .filter((p) => p.distanciaM <= radioM)
    .sort((a, b) => a.distanciaM - b.distanciaM)
    .slice(0, limite);
}

/**
 * Segundos transcurridos del día **en Santiago**.
 *
 * No se usa la hora del dispositivo: el feed declara sus horarios en
 * `America/Santiago`, y un teléfono con otra zona horaria —alguien de viaje,
 * un reloj mal configurado, o el navegador de un servidor— mostraría las
 * frecuencias de una hora equivocada.
 */
export function segundosEnSantiago(momento = new Date()): number {
  const partes = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(momento);
  const valor = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  // `es-CL` puede devolver "24" a medianoche; se normaliza a 0.
  return (valor("hour") % 24) * 3600 + valor("minute") * 60 + valor("second");
}

/** Normaliza para buscar sin tildes ni mayúsculas. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const indiceBusqueda = PARADEROS.map((p) => ({
  paradero: p,
  clave: normalizar(`${p.nombre} ${p.codigo}`),
}));

/**
 * Busca un lugar por nombre de paradero.
 *
 * No hay geocodificador todavía, pero en Santiago los nombres de paradero
 * mencionan hitos —«(M) La Moneda», «Plaza Egaña», «Estadio Nacional»—, así
 * que buscar entre ellos resuelve buena parte de los destinos reales.
 */
export function buscarLugares(texto: string, limite = 8): Paradero[] {
  const clave = normalizar(texto);
  if (clave.length < 2) return [];
  const resultados: { p: Paradero; puntaje: number }[] = [];
  for (const entrada of indiceBusqueda) {
    const posicion = entrada.clave.indexOf(clave);
    if (posicion < 0) continue;
    // Coincidir al principio del nombre vale más que coincidir al medio.
    resultados.push({ p: entrada.paradero, puntaje: posicion });
    if (resultados.length > 400) break;
  }
  return resultados
    .sort((a, b) => a.puntaje - b.puntaje || a.p.nombre.localeCompare(b.p.nombre))
    .slice(0, limite)
    .map((r) => r.p);
}

export function largoDeTramo(recorrido: Recorrido, desde: number, hasta: number): number {
  let total = 0;
  for (let i = desde; i < hasta; i++) {
    const a = PARADERO_POR_ID.get(recorrido.paradas[i]);
    const b = PARADERO_POR_ID.get(recorrido.paradas[i + 1]);
    if (a && b) total += distanciaM(a, b);
  }
  return total;
}

export { indicePorParadero };
