/* ---------------------------------------------------------------------------
   La geometría de la marca de Kupay. **Fuente única.**

   Este archivo es el original del símbolo. De acá salen los íconos de las
   tiendas (`marca.mjs`) y también el símbolo que la app dibuja en pantalla:
   `marca.mjs` escribe `movil/src/componentes/geometriaMarca.ts` a partir de
   estos mismos números.

   La razón es concreta. Antes había dos dibujos distintos —uno en el ícono,
   otro hecho con vistas dentro de la app— y se habían ido separando: distinto
   ángulo, distinto grosor, los vértices sin juntar. Un logotipo que cambia de
   forma según dónde aparece no es un logotipo. Ahora hay uno solo.

   --------------------------------------------------------------------------
   El símbolo: dos ángulos que avanzan hacia un punto.

   El punto es el paradero. Los ángulos son lo que se acerca; el de atrás va
   más tenue y más chico, que es como se dibuja movimiento sin recurrir a
   líneas de velocidad. No hay ninguna micro, y es a propósito: Kupay no vende
   buses, vende la respuesta a una pregunta —¿viene?—.

   Está dibujado para verse a 29 px antes que a 1024, porque un ícono de app se
   ve casi siempre del porte de una uña.
--------------------------------------------------------------------------- */

/** Todo se define en una caja de 100 × 100 y se escala desde ahí. */
export const CAJA = 100;

/**
 * El grosor del trazo, igual en las dos flechas.
 *
 * Que el ángulo de atrás sea más chico pero **no** más delgado es deliberado:
 * adelgazarlo lo haría desaparecer a tamaño de ícono, y además un grosor único
 * en todas las piezas es lo que hace que un dibujo se lea como uno solo.
 */
export const TRAZO = 9;

/**
 * Los dos ángulos.
 *
 * El de atrás es el mismo de adelante al 70%: misma abertura, mismo carácter.
 * Antes eran dos formas de proporciones distintas y se notaba.
 *
 * La abertura es de ~80°, no de 90°. Noventa da una punta de flecha genérica;
 * ochenta es apenas más filo y ya se lee como dirección.
 */
export const ANGULOS = [
  { d: "M 15 33 L 29 50 L 15 67", opacidad: 0.42 },
  { d: "M 33 26 L 53 50 L 33 74", opacidad: 1 },
];

/** El punto de destino. Diámetro 18 = dos veces el trazo: pesa más que una línea. */
export const PUNTO = { cx: 77, cy: 50, r: 9 };

/**
 * El conjunto va **centrado ópticamente**, no matemáticamente.
 *
 * El contenido ocupa de x=10,1 a x=86: su centro real cae en 48, dos unidades
 * a la izquierda del centro de la caja. Está hecho a propósito, porque el punto
 * sólido de la derecha tira el peso visual hacia ese lado; centrarlo con la
 * regla lo dejaría corrido.
 */
export const CENTRO_OPTICO = { x: 48.05, y: 50 };

/**
 * La caja **del dibujo**, no la del lienzo.
 *
 * El símbolo ocupa 75,5 × 57 de las 100 × 100 disponibles: es ancho y bajo. Para
 * un ícono esa diferencia es el margen y está bien, pero para componer el
 * logotipo hay que usar estos números y no los de la caja, o la palabra queda
 * separada del símbolo por un vacío que nadie puso ahí.
 *
 * Sale de: x de 15−4,5 a 77+9; y de 26−4,5 a 74+4,5.
 */
export const CONTENIDO = { x: 10.5, y: 21.5, ancho: 75.5, alto: 57 };

/**
 * El logotipo: el símbolo y la palabra, en proporción al cuerpo de la letra.
 *
 * `alto: 0.93` hace que el símbolo abarque desde el ascendente de la «k» hasta
 * el descendente de la «y». No es un capricho de composición: con Manrope
 * ExtraBold a ese tamaño el trazo del símbolo (6,7% del cuerpo) queda del mismo
 * grosor que el asta de las letras (≈7%). Más chico, el símbolo se ve endeble
 * al lado de la palabra; fue el primer defecto que saltó al mirarlos juntos.
 *
 * `espacio: 0.3` es más de lo que pediría la regla, y es por el punto: al ser
 * redondo y estar suelto, con menos aire se lee como si fuera parte de la
 * palabra en vez del final del símbolo.
 */
export const LOGOTIPO = { alto: 0.93, espacio: 0.3, interletrado: -0.035 };

/** El símbolo recortado a su dibujo, para componerlo con texto. */
export function svgMarcaAjustada({ tinta = "#ffffff", alto = 100 } = {}) {
  const ancho = (alto * CONTENIDO.ancho) / CONTENIDO.alto;
  const angulos = ANGULOS.map(
    (a) => `<path d="${a.d}" opacity="${a.opacidad}"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CONTENIDO.x} ${CONTENIDO.y} ${CONTENIDO.ancho} ${CONTENIDO.alto}" width="${ancho}" height="${alto}">
  <g fill="none" stroke="${tinta}" stroke-width="${TRAZO}" stroke-linecap="round" stroke-linejoin="round">${angulos}</g>
  <circle cx="${PUNTO.cx}" cy="${PUNTO.cy}" r="${PUNTO.r}" fill="${tinta}"/>
</svg>`;
}

/** La marca completa como SVG, para cualquier tamaño y color. */
export function svgMarca({
  tinta = "#ffffff",
  fondo = "none",
  escala = 1,
  tam = 1024,
} = {}) {
  const k = CAJA / 2;
  // Siempre se recentra, incluso a escala 1: el centrado óptico es parte del
  // dibujo, no un ajuste que se aplique sólo a veces.
  const transformar = ` transform="translate(${k} ${k}) scale(${escala}) translate(${-CENTRO_OPTICO.x} ${-CENTRO_OPTICO.y})"`;
  const angulos = ANGULOS.map(
    (a) => `<path d="${a.d}" opacity="${a.opacidad}"/>`,
  ).join("\n      ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CAJA} ${CAJA}" width="${tam}" height="${tam}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2d827d"/>
      <stop offset="1" stop-color="#1c5754"/>
    </linearGradient>
  </defs>
  ${fondo === "none" ? "" : `<rect width="${CAJA}" height="${CAJA}" fill="${fondo}"/>`}
  <g${transformar}>
    <g fill="none" stroke="${tinta}" stroke-width="${TRAZO}" stroke-linecap="round" stroke-linejoin="round">
      ${angulos}
    </g>
    <circle cx="${PUNTO.cx}" cy="${PUNTO.cy}" r="${PUNTO.r}" fill="${tinta}"/>
  </g>
</svg>`;
}
