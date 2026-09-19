/**
 * Proyección Web Mercator: convierte coordenadas a píxeles de mapa.
 *
 * Es la misma matemática que usan Google Maps y OpenStreetMap. El mundo entero
 * mide `256 · 2^zoom` píxeles de lado, y cada tesela es un cuadrado de 256 px
 * dentro de esa grilla.
 */

export const TESELA = 256;

export function anchoDelMundo(zoom: number): number {
  return TESELA * 2 ** zoom;
}

export function lonAX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * anchoDelMundo(zoom);
}

export function latAY(lat: number, zoom: number): number {
  const seno = Math.sin((lat * Math.PI) / 180);
  const acotado = Math.min(Math.max(seno, -0.9999), 0.9999);
  return (0.5 - Math.log((1 + acotado) / (1 - acotado)) / (4 * Math.PI)) * anchoDelMundo(zoom);
}

export function xALon(x: number, zoom: number): number {
  return (x / anchoDelMundo(zoom)) * 360 - 180;
}

export function yALat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / anchoDelMundo(zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** Distancia aproximada en metros entre dos coordenadas. */
export function distanciaM(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371008.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
