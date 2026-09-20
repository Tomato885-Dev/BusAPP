import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { useColores } from "../tema";

/**
 * El símbolo de Kupay, dibujado y opcionalmente en movimiento.
 *
 * Dos ángulos que avanzan hacia un punto: el punto es el paradero, los ángulos
 * lo que se acerca. Animado, los ángulos recorren esa distancia en bucle, que
 * es literalmente lo que significa «küpay».
 *
 * Se dibuja con vistas y no con una imagen para poder teñirlo y animarlo sin
 * cargar nada: la pantalla de carga no puede depender de que algo cargue.
 */
export function Marca({
  tamano = 64,
  color,
  animado,
}: {
  tamano?: number;
  color?: string;
  animado?: boolean;
}) {
  const c = useColores();
  const tinta = color ?? c.marca;
  const avance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animado) return;
    const bucle = Animated.loop(
      Animated.timing(avance, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
    );
    bucle.start();
    return () => bucle.stop();
  }, [animado, avance]);

  // Unidad de medida: todo el símbolo se define en proporción a su tamaño, así
  // que sirve igual para un ícono de 24 y para una pantalla de carga de 120.
  const u = tamano / 64;
  const trazo = Math.max(2, Math.round(5 * u));
  const brazo = 13 * u;

  const paso = (retraso: number) =>
    animado
      ? {
          transform: [
            {
              translateX: avance.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 6 * u, 0],
              }),
            },
          ],
          opacity: avance.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.25 + retraso, 0.85, 0.25 + retraso],
          }),
        }
      : { opacity: 0.4 + retraso };

  return (
    <View style={[s.caja, { width: tamano, height: tamano }]}>
      <Animated.View style={[s.angulo, { left: 6 * u }, paso(0)]}>
        <Angulo brazo={brazo} trazo={trazo} color={tinta} />
      </Animated.View>
      <Animated.View style={[s.angulo, { left: 20 * u }, paso(0.15)]}>
        <Angulo brazo={brazo} trazo={trazo} color={tinta} />
      </Animated.View>
      <View
        style={{
          position: "absolute",
          right: 4 * u,
          width: 13 * u,
          height: 13 * u,
          borderRadius: 7 * u,
          backgroundColor: tinta,
        }}
      />
    </View>
  );
}

/** Un ángulo «›», hecho con dos barras giradas. */
function Angulo({
  brazo,
  trazo,
  color,
}: {
  brazo: number;
  trazo: number;
  color: string;
}) {
  const comun = {
    position: "absolute" as const,
    width: trazo,
    height: brazo,
    borderRadius: trazo / 2,
    backgroundColor: color,
  };
  return (
    <View style={{ width: brazo, height: brazo * 1.6 }}>
      <View style={[comun, { top: 0, transform: [{ rotate: "-38deg" }] }]} />
      <View style={[comun, { bottom: 0, transform: [{ rotate: "38deg" }] }]} />
    </View>
  );
}

const s = StyleSheet.create({
  caja: { alignItems: "center", justifyContent: "center" },
  angulo: { position: "absolute" },
});
