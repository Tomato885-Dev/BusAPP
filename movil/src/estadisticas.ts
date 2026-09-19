/**
 * «Tus números»: lo que la app sabe del usuario, devuelto al usuario.
 *
 * Son datos que él genera al usar Kupay. Guardárselos y no mostrárselos sería
 * quedarse con algo que es suyo.
 *
 * Todo se calcula en el servidor con `mis_estadisticas()`, una función que
 * filtra por `auth.uid()`: no existe forma de pedir los números de otra persona,
 * ni siquiera modificando la petición desde el navegador.
 */

import { PARADERO_POR_ID, RECORRIDO_POR_ID } from "./red";
import { supabase } from "./supabase";

export interface Estadisticas {
  consultas: number;
  /** Segundos de espera promedio, o `null` si todavía no hay con qué calcular. */
  esperaMedia: number | null;
  paraderoHabitual: string | null;
  recorridoHabitual: string | null;
}

/**
 * Registra que el usuario miró un paradero.
 *
 * Falla en silencio a propósito: un problema guardando una estadística no
 * puede impedirle a nadie ver si viene su micro.
 */
export function registrarConsulta(
  usuarioId: string | null,
  paraderoId: string,
  recorridoId?: string,
): void {
  if (!usuarioId || !supabase) return;
  void supabase
    .from("consultas")
    .insert({
      usuario_id: usuarioId,
      paradero_id: paraderoId,
      recorrido_id: recorridoId ?? null,
    })
    .then(() => {});
}

export async function misEstadisticas(dias = 30): Promise<Estadisticas | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("mis_estadisticas", { desde_dias: dias });
  if (error || !data || data.length === 0) return null;

  const f = data[0] as {
    consultas_totales: number | string;
    espera_media_s: number | string | null;
    paradero_habitual: string | null;
    recorrido_habitual: string | null;
  };

  return {
    consultas: Number(f.consultas_totales ?? 0),
    esperaMedia: f.espera_media_s === null ? null : Number(f.espera_media_s),
    // El servidor devuelve identificadores; al usuario le sirven los nombres.
    paraderoHabitual: f.paradero_habitual
      ? (PARADERO_POR_ID.get(f.paradero_habitual)?.nombre ?? f.paradero_habitual)
      : null,
    recorridoHabitual: f.recorrido_habitual
      ? (RECORRIDO_POR_ID.get(f.recorrido_habitual)?.nombre ?? f.recorrido_habitual)
      : null,
  };
}

/** «14 min», «1 h 5 min». */
export function esperaTexto(segundos: number): string {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
