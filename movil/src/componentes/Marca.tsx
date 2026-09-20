import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { useColores } from "../tema";
import {
  ANGULOS,
  CAJA,
  CENTRO_OPTICO,
  CONTENIDO,
  PUNTO,
  TRAZO,
} from "./geometriaMarca";

const PathAnimado = Animated.createAnimatedComponent(Path);

/**
 * El símbolo de Kupay.
 *
 * Dos ángulos que avanzan hacia un punto: el punto es el paradero, los ángulos
 * lo que se acerca.
 *
 * **Es el mismo dibujo que llevan los íconos de las tiendas.** Las
 * coordenadas salen de `geometriaMarca.ts`, que genera `marca/marca.mjs` junto
 * con los PNG. Antes esto se armaba con vistas rotadas y se había ido
 * separando del ícono: distinto ángulo, distinto grosor y los vértices sin
 * juntar, porque dos barras giradas no forman una esquina. Con SVG la unión es
 * una sola línea con su remate redondo, que es lo que el dibujo pedía.
 *
 * Animado, los ángulos recorren la distancia hacia el punto en bucle, que es
 * literalmente lo que significa «küpay».
 */
export function Marca({
  tamano = 64,
  color,
  animado,
  /** Recorta el lienzo al dibujo. Para componer con texto; ver `Logotipo`. */
  ajustado,
}: {
  tamano?: number;
  color?: string;
  animado?: boolean;
  ajustado?: boolean;
}) {
  const c = useColores();
  const tinta = color ?? c.marca;
  const avance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animado) return;
    const bucle = Animated.loop(
      Animated.timing(avance, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.cubic),
        // Los atributos de SVG no los mueve el hilo nativo.
        useNativeDriver: false,
      }),
    );
    bucle.start();
    return () => bucle.stop();
  }, [animado, avance]);

  const vista = ajustado
    ? `${CONTENIDO.x} ${CONTENIDO.y} ${CONTENIDO.ancho} ${CONTENIDO.alto}`
    : `0 0 ${CAJA} ${CAJA}`;
  const ancho = ajustado ? (tamano * CONTENIDO.ancho) / CONTENIDO.alto : tamano;

  // Sin animación el símbolo se recentra ópticamente dentro del lienzo
  // cuadrado, igual que el ícono. Recortado ya no hace falta: el lienzo *es*
  // el dibujo.
  const centrado =
    ajustado
      ? undefined
      : `translate(${CAJA / 2} ${CAJA / 2}) translate(${-CENTRO_OPTICO.x} ${-CENTRO_OPTICO.y})`;

  return (
    <View style={{ width: ancho, height: tamano }}>
      <Svg width={ancho} height={tamano} viewBox={vista}>
        <G transform={centrado}>
          <G
            fill="none"
            stroke={tinta}
            strokeWidth={TRAZO}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ANGULOS.map((a, i) =>
              animado ? (
                <PathAnimado
                  key={a.d}
                  d={a.d}
                  // El de atrás sale de más lejos y llega más tenue: eso es lo
                  // que hace leer la secuencia como movimiento y no como dos
                  // formas parpadeando.
                  opacity={avance.interpolate({
                    inputRange: [0, 0.45, 1],
                    outputRange: [a.opacidad * 0.35, a.opacidad, a.opacidad * 0.35],
                  })}
                  translateX={avance.interpolate({
                    inputRange: [0, 0.45, 1],
                    outputRange: [-5 + i * 2, 4 + i * 2, -5 + i * 2],
                  })}
                />
              ) : (
                <Path key={a.d} d={a.d} opacity={a.opacidad} />
              ),
            )}
          </G>
          <Circle cx={PUNTO.cx} cy={PUNTO.cy} r={PUNTO.r} fill={tinta} />
        </G>
      </Svg>
    </View>
  );
}
