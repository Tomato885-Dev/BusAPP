/**
 * Sistema de diseño.
 *
 * Tres decisiones que lo ordenan todo:
 *
 * 1. **El azul de marca no compite con los estados.** Verde, ámbar y rojo
 *    significan algo (viene / ojo / no viene). Si la marca usara alguno de
 *    esos, el color dejaría de informar. Por eso el acento es azul.
 * 2. **El color nunca informa solo.** Cerca del 8% de los hombres no distingue
 *    rojo de verde, y el estado es la información central del producto: cada
 *    estado lleva además texto e ícono.
 * 3. **El modo oscuro es un diseño, no una inversión.** Se usa la app de noche
 *    esperando una micro; las superficies oscuras son azuladas, no grises
 *    muertos, y los acentos suben de luminosidad para mantener contraste.
 */

import { Platform, useColorScheme } from "react-native";

const claro = {
  // Superficies, de atrás hacia adelante
  fondo: "#f2f4f8",
  superficie: "#ffffff",
  superficieAlta: "#ffffff",
  borde: "#e4e8ef",
  bordeSuave: "#eef1f6",

  // Texto
  texto: "#101725",
  textoSuave: "#5a6478",
  textoTenue: "#8d97a8",
  textoInverso: "#ffffff",

  // Marca
  marca: "#3d5afe",
  marcaSuave: "#e8ecff",
  marcaTexto: "#2b42d6",

  // Estados del motor
  ok: "#087f4b",
  okFondo: "#dff5e9",
  aviso: "#8a5200",
  avisoFondo: "#fdeed5",
  malo: "#b3261e",
  maloFondo: "#fdeaea",
  neutro: "#636b7a",
  neutroFondo: "#eaedf2",

  // Mapa
  mapaFondo: "#e8eaed",
  sombra: "rgba(16, 23, 37, 0.14)",
};

const oscuro: typeof claro = {
  fondo: "#0b0f17",
  superficie: "#141a25",
  superficieAlta: "#1c2431",
  borde: "#273041",
  bordeSuave: "#1e2634",

  texto: "#eef1f6",
  textoSuave: "#a3adbf",
  textoTenue: "#6d7789",
  textoInverso: "#0b0f17",

  marca: "#8ba0ff",
  marcaSuave: "#1c2444",
  marcaTexto: "#b3c1ff",

  ok: "#4ade80",
  okFondo: "#0f2a1c",
  aviso: "#fbbf24",
  avisoFondo: "#2e2410",
  malo: "#fca5a5",
  maloFondo: "#33191a",
  neutro: "#9aa3b2",
  neutroFondo: "#1b2230",

  mapaFondo: "#12161d",
  sombra: "rgba(0, 0, 0, 0.5)",
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

/** Radios: generosos, que es lo que separa una app actual de una de 2014. */
export const radio = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pastilla: 999,
} as const;

/** Escala tipográfica. */
export const tipo = {
  gigante: { fontSize: 44, fontWeight: "800", letterSpacing: -1.4 },
  titulo: { fontSize: 26, fontWeight: "700", letterSpacing: -0.6 },
  subtitulo: { fontSize: 19, fontWeight: "700", letterSpacing: -0.3 },
  cuerpo: { fontSize: 15, fontWeight: "500", letterSpacing: -0.1 },
  cuerpoFuerte: { fontSize: 15, fontWeight: "700", letterSpacing: -0.1 },
  menor: { fontSize: 13, fontWeight: "500" },
  micro: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
} as const;

/** Elevación. En web se usa boxShadow porque las sombras nativas no aplican. */
export function elevacion(c: Colores, nivel: 1 | 2 | 3) {
  const alto = { 1: 2, 2: 8, 3: 18 }[nivel];
  const radioSombra = { 1: 6, 2: 20, 3: 38 }[nivel];
  if (Platform.OS === "web") {
    return { boxShadow: `0 ${alto}px ${radioSombra}px ${c.sombra}` } as const;
  }
  return {
    shadowColor: "#000",
    shadowOpacity: nivel === 1 ? 0.1 : nivel === 2 ? 0.16 : 0.26,
    shadowRadius: radioSombra / 2,
    shadowOffset: { width: 0, height: alto / 2 },
    elevation: alto,
  } as const;
}
