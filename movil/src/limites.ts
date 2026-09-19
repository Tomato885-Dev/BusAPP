/**
 * Límites del plan gratis.
 *
 * La regla que los ordena está en `docs/11-premium.md`: lo que el usuario
 * **pregunta** es gratis; lo que la app hace **por él** se cobra. Estos dos
 * números no limitan preguntar, limitan cuántas cosas puede delegarle a la app.
 *
 * Uno de cada cosa alcanza para el viaje principal de cualquier persona. Quien
 * necesita más es, por definición, quien más provecho le saca.
 */

export const LIMITE_FAVORITOS = 3;
export const LIMITE_RUTINAS = 1;

export interface Tope {
  /** Si el usuario puede agregar uno más. */
  alcanza: boolean;
  /** Cuántos lleva. */
  usados: number;
  /** El tope de su plan, o `null` si no tiene. */
  tope: number | null;
}

export function tope(usados: number, limite: number, esPremium: boolean): Tope {
  if (esPremium) return { alcanza: true, usados, tope: null };
  return { alcanza: usados < limite, usados, tope: limite };
}
