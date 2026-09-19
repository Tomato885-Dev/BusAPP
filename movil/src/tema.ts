/**
 * Colores y espaciado.
 *
 * Los cuatro colores de estado son la información central del producto, así que
 * van con texto o ícono al lado **siempre**: cerca del 8% de los hombres no
 * distingue rojo de verde, y el estado no puede depender sólo del color.
 */

import { useColorScheme } from "react-native";

const claro = {
  fondo: "#f4f5f7",
  panel: "#ffffff",
  texto: "#15181d",
  texto2: "#5b636e",
  texto3: "#8b939f",
  linea: "#e2e5ea",
  acento: "#1d4ed8",
  ok: "#0f8a4a",
  okFondo: "#e6f5ed",
  aviso: "#9a6200",
  avisoFondo: "#fdf1dc",
  malo: "#b3261e",
  maloFondo: "#fdeceb",
  neutro: "#6b7280",
  neutroFondo: "#eef0f3",
};

const oscuro: typeof claro = {
  fondo: "#0e1013",
  panel: "#16191e",
  texto: "#eceef1",
  texto2: "#a7aeb8",
  texto3: "#727a85",
  linea: "#262b32",
  acento: "#7aa2ff",
  ok: "#4ade80",
  okFondo: "#12291d",
  aviso: "#fbbf24",
  avisoFondo: "#2e2410",
  malo: "#f87171",
  maloFondo: "#2e1616",
  neutro: "#9ca3af",
  neutroFondo: "#1e2228",
};

export type Colores = typeof claro;

export function useColores(): Colores {
  return useColorScheme() === "dark" ? oscuro : claro;
}

export const espacio = { xs: 4, sm: 8, md: 12, lg: 18, xl: 24 };
