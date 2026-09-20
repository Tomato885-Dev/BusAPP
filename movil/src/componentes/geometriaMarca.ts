/**
 * El símbolo de Kupay, en números.
 *
 * ⚠️ **Archivo generado. No editarlo a mano.**
 * Sale de `marca/geometria.mjs` al correr `node marca/marca.mjs`.
 *
 * Existe para que el símbolo que la app dibuja y el que llevan los íconos de
 * las tiendas sean el mismo dibujo, y no dos que se parecen.
 */

/** Todo está definido en una caja de 100 × 100. */
export const CAJA = 100;

/** Grosor del trazo, igual en los dos ángulos. */
export const TRAZO = 9;

/** Los dos ángulos. El primero es el de atrás: más chico y más tenue. */
export const ANGULOS = [
  {
    d: "M 15 33 L 29 50 L 15 67",
    opacidad: 0.42
  },
  {
    d: "M 33 26 L 53 50 L 33 74",
    opacidad: 1
  }
] as const;

/** El punto de destino. */
export const PUNTO = {cx:77,cy:50,r:9} as const;

/** Centro óptico del conjunto: dos unidades a la izquierda del geométrico. */
export const CENTRO_OPTICO = {x:48.05,y:50} as const;

/** La caja del dibujo, para componer el logotipo sin vacíos sobrantes. */
export const CONTENIDO = {x:10.5,y:21.5,ancho:75.5,alto:57} as const;

/** Proporciones del logotipo, relativas al cuerpo de la letra. */
export const LOGOTIPO = {alto:0.93,espacio:0.3,interletrado:-0.035} as const;
