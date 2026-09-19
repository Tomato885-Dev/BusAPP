/**
 * Búsqueda de direcciones.
 *
 * Nadie planifica un viaje sabiéndose el nombre del paradero: uno escribe «La
 * Capitanía 436». Esto convierte una dirección escrita en coordenadas.
 *
 * Usa Nominatim, el geocodificador de OpenStreetMap: gratuito y sin registro.
 * Su política de uso permite un pedido por segundo y volúmenes bajos, de modo
 * que **sirve para desarrollar, no para producción**. Antes de tener usuarios
 * hay que mover esto al backend, con caché y un proveedor propio o de pago.
 */

import { buscarLugares, type Paradero } from "./red";

/** Recuadro de la Región Metropolitana, para no traer resultados de otro país. */
const RECUADRO = { lonMin: -70.95, latMin: -33.75, lonMax: -70.35, latMax: -33.2 };

const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";

export interface Lugar {
  id: string;
  nombre: string;
  detalle: string;
  lat: number;
  lon: number;
  tipo: "direccion" | "paradero";
}

interface RespuestaNominatim {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
}

function comoLugar(p: Paradero): Lugar {
  return {
    id: `paradero:${p.id}`,
    nombre: p.nombre,
    detalle: `Paradero ${p.codigo}`,
    lat: p.lat,
    lon: p.lon,
    tipo: "paradero",
  };
}

/**
 * Busca una dirección en Santiago.
 *
 * Devuelve lista vacía si falla la red: la búsqueda local de paraderos sigue
 * funcionando, así que la pantalla no se queda sin nada que mostrar.
 */
export async function buscarDirecciones(
  texto: string,
  senal?: AbortSignal,
): Promise<Lugar[]> {
  const consulta = texto.trim();
  if (consulta.length < 3) return [];

  const parametros = new URLSearchParams({
    q: consulta,
    format: "json",
    addressdetails: "0",
    limit: "6",
    countrycodes: "cl",
    bounded: "1",
    viewbox: `${RECUADRO.lonMin},${RECUADRO.latMin},${RECUADRO.lonMax},${RECUADRO.latMax}`,
  });

  try {
    const r = await fetch(`${URL_NOMINATIM}?${parametros}`, {
      signal: senal,
      headers: { Accept: "application/json" },
    });
    if (!r.ok) return [];
    const datos: RespuestaNominatim[] = await r.json();
    return datos.map((d) => {
      const partes = d.display_name.split(",").map((x) => x.trim());
      return {
        id: `direccion:${d.place_id}`,
        nombre: d.name?.trim() || partes[0],
        detalle: partes.slice(1, 3).join(", "),
        lat: Number(d.lat),
        lon: Number(d.lon),
        tipo: "direccion" as const,
      };
    });
  } catch {
    // Incluye la cancelación al seguir escribiendo, que no es un error.
    return [];
  }
}

/**
 * Busca direcciones y paraderos a la vez.
 *
 * Las direcciones van primero porque son lo que la gente escribe; los paraderos
 * quedan abajo como complemento para quien ya sabe cuál quiere.
 */
export async function buscarTodo(texto: string, senal?: AbortSignal): Promise<Lugar[]> {
  const locales = buscarLugares(texto, 4).map(comoLugar);
  const direcciones = await buscarDirecciones(texto, senal);
  const vistos = new Set<string>();
  return [...direcciones, ...locales].filter((l) => {
    const clave = `${l.lat.toFixed(4)},${l.lon.toFixed(4)}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}
