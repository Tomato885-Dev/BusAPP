/**
 * Sistema de diseño.
 *
 * La paleta busca **calma**. Alguien abre esta app apurado, atrasado o perdido:
 * la interfaz no puede sumar tensión. Cuatro decisiones la ordenan:
 *
 * 1. **Teal apagado como marca.** Equilibra el azul —confianza, serenidad— con
 *    el verde —calma, naturaleza—, y no compite con los colores de estado.
 * 2. **Terracota en vez de rojo de alarma.** «Esta micro no viene» es una mala
 *    noticia, no una emergencia. Un rojo saturado dispara alarma; el barro
 *    apagado comunica el problema sin alterar a nadie.
 * 3. **Neutros cálidos, no grises fríos.** El fondo tiene una base verdosa
 *    tenue: descansa la vista y reduce la fatiga visual.
 * 4. **El color nunca informa solo.** Cerca del 8% de los hombres no distingue
 *    rojo de verde, y el estado es la información central del producto: cada
 *    estado lleva además texto e ícono.
 *
 * Todos los colores de texto verificados contra WCAG 2.1 AA sobre su superficie
 * (≥ 4,5:1, o ≥ 3:1 en los tenues que sólo se usan en texto grande).
 */

import { Platform, useColorScheme } from "react-native";

const claro = {
  // Superficies: neutros cálidos con fondo verdoso, no grises fríos.
  fondo: "#f3f5f4",
  superficie: "#ffffff",
  superficieAlta: "#ffffff",
  borde: "#e2e8e6",
  bordeSuave: "#edf1f0",

  // Texto
  texto: "#182220",
  textoSuave: "#556360",
  textoTenue: "#8a9794",
  textoInverso: "#ffffff",

  // Marca: teal apagado. Equilibra el azul (confianza) con el verde (calma).
  marca: "#256d6a",
  marcaSuave: "#e2efee",
  marcaTexto: "#1c5754",

  // Estados
  ok: "#3d7a54",
  okFondo: "#e6f0e9",
  aviso: "#8a6116",
  avisoFondo: "#f7eeda",
  malo: "#a04c37",
  maloFondo: "#f7e8e3",
  neutro: "#65726f",
  neutroFondo: "#ecf0ef",

  // Mapa
  mapaFondo: "#e8ecea",
  mapaVelo: "rgba(243, 245, 244, 0.30)",
  sombra: "rgba(24, 34, 32, 0.10)",
  sombraCorta: "rgba(24, 34, 32, 0.06)",
  /** Superficie translúcida sobre el mapa, para cuando no hay desenfoque. */
  vidrio: "rgba(255, 255, 255, 0.93)",
  vidrioBorde: "rgba(255, 255, 255, 0.6)",
};

const oscuro: typeof claro = {
  fondo: "#0f1413",
  superficie: "#19201f",
  superficieAlta: "#212927",
  borde: "#2b3533",
  bordeSuave: "#222b29",

  texto: "#e7ecea",
  textoSuave: "#a0adaa",
  textoTenue: "#6f7c79",
  textoInverso: "#0f1413",

  marca: "#69bdb6",
  marcaSuave: "#16302e",
  marcaTexto: "#8ed3cd",

  ok: "#7cba90",
  okFondo: "#16291d",
  aviso: "#d7a451",
  avisoFondo: "#2c2412",
  malo: "#dd9079",
  maloFondo: "#2e1d18",
  neutro: "#95a3a0",
  neutroFondo: "#1f2726",

  mapaFondo: "#141a19",
  // En modo oscuro el velo oscurece las teselas claras en vez de aclararlas.
  mapaVelo: "rgba(15, 20, 19, 0.52)",
  sombra: "rgba(0, 0, 0, 0.45)",
  sombraCorta: "rgba(0, 0, 0, 0.35)",
  vidrio: "rgba(25, 32, 31, 0.94)",
  vidrioBorde: "rgba(255, 255, 255, 0.08)",
};

export type Colores = typeof claro;

export function useColores(): Colores {
  return useColorScheme() === "dark" ? oscuro : claro;
}

export function useEsOscuro(): boolean {
  return useColorScheme() === "dark";
}

/** Escala de espaciado en múltiplos de 4. */
export const esp = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Radios.
 *
 * Generosos a propósito: en una pantalla donde casi todo es una tarjeta, el
 * radio es lo que más dice de la época del diseño. Los de las superficies
 * grandes —hojas, tarjetas— son claramente mayores que los de las piezas
 * chicas, y ese contraste es lo que da jerarquía.
 */
export const radio = {
  sm: 10,
  md: 18,
  lg: 26,
  xl: 34,
  pastilla: 999,
} as const;

/**
 * La tipografía de Kupay: **Manrope**.
 *
 * Se eligió por dos razones concretas, no por gusto. Primero, sus números: esta
 * app se lee de reojo en la calle, y casi todo lo que importa —«4 min», «0–12
 * min»— es un número. Manrope tiene cifras abiertas y bien separadas, que no se
 * confunden a tamaño chico ni con el teléfono en movimiento. Segundo, su forma:
 * es geométrica sin ser fría, que es exactamente el registro de la paleta.
 *
 * **Cada peso es un archivo distinto.** Con tipografías propias, `fontWeight`
 * no elige el archivo: hay que nombrarlo. Poner `fontWeight: "700"` sobre una
 * familia cargada da una negrita falsa, que el motor dibuja engordando los
 * trazos y se ve sucia. Por eso en toda la app se usa `fuente.*`, nunca
 * `fontWeight`.
 */
export const fuente = {
  normal: "Manrope_500Medium",
  semi: "Manrope_600SemiBold",
  fuerte: "Manrope_700Bold",
  extra: "Manrope_800ExtraBold",
} as const;

/** Escala tipográfica. */
export const tipo = {
  gigante: { fontFamily: fuente.extra, fontSize: 52, letterSpacing: -2 },
  titulo: { fontFamily: fuente.extra, fontSize: 28, letterSpacing: -0.9 },
  subtitulo: { fontFamily: fuente.fuerte, fontSize: 20, letterSpacing: -0.4 },
  cuerpo: { fontFamily: fuente.normal, fontSize: 15, letterSpacing: -0.1 },
  cuerpoFuerte: { fontFamily: fuente.fuerte, fontSize: 15, letterSpacing: -0.2 },
  menor: { fontFamily: fuente.normal, fontSize: 13 },
  // Las etiquetas de sección: chicas, espaciadas y en versalitas. El contraste
  // entre éstas y los títulos es lo que ordena la pantalla sin usar líneas.
  micro: { fontFamily: fuente.extra, fontSize: 11, letterSpacing: 0.8 },
} as const;

/**
 * Elevación.
 *
 * En web se usan dos sombras superpuestas: una corta y cerrada que define el
 * borde del objeto, y otra larga y difusa que lo separa del fondo. Una sola
 * sombra o queda dura o queda sucia; dos dan la profundidad que se ve en las
 * apps actuales. En nativo no existe esa composición, así que se aproxima.
 */
export function elevacion(c: Colores, nivel: 1 | 2 | 3) {
  const alto = { 1: 2, 2: 10, 3: 24 }[nivel];
  const radioSombra = { 1: 8, 2: 28, 3: 56 }[nivel];
  if (Platform.OS === "web") {
    return {
      boxShadow: `0 1px 2px ${c.sombraCorta}, 0 ${alto}px ${radioSombra}px ${c.sombra}`,
    } as const;
  }
  return {
    shadowColor: "#000",
    shadowOpacity: nivel === 1 ? 0.1 : nivel === 2 ? 0.16 : 0.26,
    shadowRadius: radioSombra / 2,
    shadowOffset: { width: 0, height: alto / 2 },
    elevation: alto,
  } as const;
}
