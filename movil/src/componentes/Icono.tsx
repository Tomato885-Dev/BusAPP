import { type ColorValue } from "react-native";
import Svg, { Circle, Path, Polyline } from "react-native-svg";

import { useColores } from "../tema";
import { TRAZO } from "./geometriaMarca";

/**
 * El juego de íconos de Kupay.
 *
 * Antes cada ícono era un **carácter de texto** —`≡`, `◷`, `★`, `⌕`—. Funciona
 * para salir del paso y se nota: cada glifo viene de un tipógrafo distinto, con
 * otro grosor, otro tamaño óptico y otro centrado, así que la fila de íconos
 * nunca se ve pareja. Era lo que más hacía ver la interfaz vieja.
 *
 * Éstos están dibujados, y con una sola regla: **el mismo grosor de trazo que
 * el símbolo de la marca.** El logotipo usa 9 de 100; a 24 px eso da 2,16, y
 * ése es el grosor de todos. Así el ícono de una pestaña y el símbolo de la
 * app pertenecen visiblemente al mismo dibujo.
 *
 * Todos comparten además:
 * - caja de 24 × 24, con el dibujo dentro de 20 × 20 (dos de margen)
 * - remates y uniones **redondos**, como la marca
 * - trazo y no relleno, salvo el punto de «favorito» cuando está activo
 */
export type NombreIcono =
  | "mapa"
  | "estrella"
  | "ruta"
  | "menu"
  | "buscar"
  | "ubicacion"
  | "mas"
  | "menos"
  | "lineas"
  | "reloj"
  | "campana"
  | "salida"
  | "desvio"
  | "grafico"
  | "flecha"
  | "cerrar";

/** El grosor de la marca, llevado a la caja de 24. */
const GROSOR = (TRAZO / 100) * 24;

export function Icono({
  nombre,
  tamano = 24,
  color,
  /** Rellena la forma. Sólo lo usa la estrella de favorito. */
  lleno,
}: {
  nombre: NombreIcono;
  tamano?: number;
  // `ColorValue` y no `string`: la barra de pestañas entrega el color activo
  // como un valor opaco de la plataforma, no como un texto.
  color?: ColorValue;
  lleno?: boolean;
}) {
  const c = useColores();
  const tinta = color ?? c.texto;
  const comun = {
    stroke: tinta as string,
    strokeWidth: GROSOR,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none" as const,
  };

  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      {dibujo(nombre, comun, tinta as string, lleno)}
    </Svg>
  );
}

type Comun = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: "round";
  strokeLinejoin: "round";
  fill: "none";
};

function dibujo(nombre: NombreIcono, k: Comun, tinta: string, lleno?: boolean) {
  switch (nombre) {
    // Mapa: el alfiler del paradero. No un plano doblado: lo que la pestaña
    // abre es un punto en el mapa, no un mapa.
    case "mapa":
      return (
        <>
          <Path d="M12 21c4-4.6 6-7.8 6-10.5A6 6 0 0 0 6 10.5C6 13.2 8 16.4 12 21Z" {...k} />
          <Circle cx="12" cy="10.4" r="2.3" {...k} />
        </>
      );

    case "estrella":
      return (
        <Path
          d="M12 3.6l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 16.9l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85Z"
          {...k}
          fill={lleno ? tinta : "none"}
        />
      );

    // Cómo llegar: dos flechas que se cruzan. Un viaje con combinación es
    // exactamente eso, dos tramos que no van en la misma dirección.
    case "ruta":
      return (
        <>
          <Polyline points="3.5 8 17.5 8" {...k} />
          <Polyline points="14 4.5 17.5 8 14 11.5" {...k} />
          <Polyline points="20.5 16 6.5 16" {...k} />
          <Polyline points="10 12.5 6.5 16 10 19.5" {...k} />
        </>
      );

    case "menu":
      return (
        <>
          <Polyline points="4 7 20 7" {...k} />
          <Polyline points="4 12 20 12" {...k} />
          <Polyline points="4 17 20 17" {...k} />
        </>
      );

    // Líneas: una lista con viñetas, no tres barras. Tiene que distinguirse
    // del ícono de «menú» a 21 px, que es donde conviven.
    case "lineas":
      return (
        <>
          <Circle cx="5.3" cy="7.5" r="1.9" {...k} />
          <Circle cx="5.3" cy="16.5" r="1.9" {...k} />
          <Polyline points="10.5 7.5 20 7.5" {...k} />
          <Polyline points="10.5 16.5 20 16.5" {...k} />
        </>
      );

    case "buscar":
      return (
        <>
          <Circle cx="10.8" cy="10.8" r="6.3" {...k} />
          <Polyline points="15.4 15.4 20 20" {...k} />
        </>
      );

    // Mi ubicación: la cruz de puntería del GPS, no otro alfiler. Hay que
    // distinguirla del ícono de «mapa» en la misma pantalla.
    case "ubicacion":
      return (
        <>
          <Circle cx="12" cy="12" r="6.2" {...k} />
          <Circle cx="12" cy="12" r="1.7" fill={tinta} stroke="none" />
          <Polyline points="12 2.6 12 5.4" {...k} />
          <Polyline points="12 18.6 12 21.4" {...k} />
          <Polyline points="2.6 12 5.4 12" {...k} />
          <Polyline points="18.6 12 21.4 12" {...k} />
        </>
      );

    case "mas":
      return (
        <>
          <Polyline points="12 5 12 19" {...k} />
          <Polyline points="5 12 19 12" {...k} />
        </>
      );

    case "menos":
      return <Polyline points="5 12 19 12" {...k} />;

    case "reloj":
      return (
        <>
          <Circle cx="12" cy="12" r="8.2" {...k} />
          <Polyline points="12 7.2 12 12 15.3 14" {...k} />
        </>
      );

    // Avísame antes de bajarme: una campana.
    case "campana":
      return (
        <>
          <Path d="M6.6 16.5V11a5.4 5.4 0 0 1 10.8 0v5.5h1.4H5.2Z" {...k} />
          <Path d="M10.3 19.4a1.9 1.9 0 0 0 3.4 0" {...k} />
        </>
      );

    // Aviso de salida: alguien que sale. La flecha apunta afuera.
    case "salida":
      return (
        <>
          <Path d="M13.5 4.5H6.2v15h7.3" {...k} />
          <Polyline points="11 12 20 12" {...k} />
          <Polyline points="16.6 8.6 20 12 16.6 15.4" {...k} />
        </>
      );

    // Alerta de desvío: el camino que venía recto y se va para otro lado.
    // La primera versión llevaba además un signo de exclamación y a 20 px se
    // leía como un borrón: el desvío ya es la alerta.
    case "desvio":
      return (
        <>
          <Path d="M7 20.5v-7a4 4 0 0 1 4-4h7" {...k} />
          <Polyline points="14.8 6.3 18 9.5 14.8 12.7" {...k} />
        </>
      );

    case "grafico":
      return (
        <>
          <Polyline points="4.5 19.5 19.5 19.5" {...k} />
          <Polyline points="8 19.5 8 13" {...k} />
          <Polyline points="12 19.5 12 8" {...k} />
          <Polyline points="16 19.5 16 15.5" {...k} />
        </>
      );

    case "flecha":
      return <Polyline points="9.5 5.5 16 12 9.5 18.5" {...k} />;

    case "cerrar":
      return (
        <>
          <Polyline points="6.5 6.5 17.5 17.5" {...k} />
          <Polyline points="17.5 6.5 6.5 17.5" {...k} />
        </>
      );
  }
}
