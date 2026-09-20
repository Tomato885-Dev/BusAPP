import { BlurView } from "expo-blur";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";

import { elevacion, radio, useColores, useEsOscuro, type Colores } from "../tema";

export type Altura = "asomada" | "media" | "completa";

/** Qué proporción de la pantalla ocupa cada posición. */
const PROPORCION: Record<Altura, number> = {
  asomada: 0.34,
  media: 0.58,
  completa: 0.9,
};

/** Cuánto hay que arrastrar para cambiar de posición. */
const UMBRAL = 40;
/** Velocidad a partir de la cual el gesto manda sobre la distancia. */
const VELOCIDAD_DECISIVA = 0.5;

/**
 * Franja superior de la hoja desde la que se puede arrastrar.
 *
 * Cubre la agarradera y la cabecera. Más abajo el gesto pertenece al contenido,
 * que tiene su propio desplazamiento.
 */
const ZONA_DE_ARRASTRE = 96;

const ORDEN: Altura[] = ["asomada", "media", "completa"];

/**
 * El gesto de la hoja, para colgarlo de la pantalla completa.
 *
 * **Por qué no vive dentro de la hoja.** El sistema de gestos sólo pregunta a
 * la vista que está bajo el dedo, y no captura el puntero hasta haber tomado el
 * gesto. Una hoja que ocupa un tercio de la pantalla pierde el dedo en el
 * primer movimiento hacia arriba —queda fuera de ella— y el arrastre nunca
 * empieza. Colgado de la pantalla entera eso no puede pasar.
 *
 * El gesto igual sólo se toma si **empezó** en la franja superior de la hoja,
 * así que el resto de la pantalla sigue siendo del mapa y del contenido.
 */
export function useHoja({
  altura,
  onAltura,
  margenInferior = 0,
  altoDisponible,
}: {
  altura: Altura;
  onAltura: (a: Altura) => void;
  margenInferior?: number;
  /**
   * Alto del espacio donde vive la hoja.
   *
   * No es el de la ventana: la barra de pestañas ya recorta el contenedor. Con
   * el de la ventana, la posición «completa» se salía por arriba.
   */
  altoDisponible?: number;
}) {
  const { height: altoVentana } = useWindowDimensions();
  const height = altoDisponible ?? altoVentana;

  const alto = useCallback(
    (a: Altura) => Math.round(height * PROPORCION[a]),
    [height],
  );

  const y = useRef(new Animated.Value(alto(altura))).current;
  const inicio = useRef(alto(altura));
  const altoVigente = useRef(alto(altura));

  useEffect(() => {
    const id = y.addListener(({ value }) => {
      altoVigente.current = value;
    });
    return () => y.removeListener(id);
  }, [y]);

  /**
   * Borde superior de la hoja, en coordenadas de pantalla.
   *
   * Se **mide**, no se calcula. Calcularlo a partir del alto de la ventana daba
   * 523 donde la hoja estaba en 455: la barra de pestañas ya recorta el
   * contenedor, así que el margen inferior se contaba dos veces. Medir evita
   * tener que adivinar qué hay alrededor.
   */
  const referencia = useRef<View | null>(null);
  const tope = useRef(0);

  const alMedir = useCallback(() => {
    referencia.current?.measureInWindow((_x, y) => {
      tope.current = y;
    });
  }, []);

  const topeActual = useCallback(() => tope.current, []);

  const irA = useCallback(
    (a: Altura, velocidad = 0) => {
      onAltura(a);
      Animated.spring(y, {
        toValue: alto(a),
        velocity: -velocidad,
        damping: 26,
        stiffness: 240,
        mass: 0.9,
        useNativeDriver: false,
      }).start();
    },
    [onAltura, y, alto],
  );

  // Si la altura cambia desde fuera —al abrir otro paradero— la hoja se acomoda
  // sola, con la misma animación que si la hubieran arrastrado.
  useEffect(() => {
    Animated.spring(y, {
      toValue: alto(altura),
      damping: 26,
      stiffness: 240,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  }, [altura, alto, y]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (e, g) => {
          if (Math.abs(g.dy) <= 4 || Math.abs(g.dy) <= Math.abs(g.dx)) return false;
          // Dónde empezó el gesto: donde está ahora, menos lo ya recorrido.
          const desde = e.nativeEvent.pageY - g.dy - topeActual();
          return desde >= -10 && desde < ZONA_DE_ARRASTRE;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          inicio.current = altoVigente.current;
          y.stopAnimation();
        },
        onPanResponderMove: (_e, g) => {
          const tope = alto("completa") + 40;
          y.setValue(Math.max(90, Math.min(tope, inicio.current - g.dy)));
        },
        onPanResponderRelease: (_e, g) => {
          const actual = inicio.current - g.dy;
          const i = ORDEN.indexOf(altura);

          // Un gesto rápido cambia de posición aunque haya recorrido poco: es
          // lo que uno espera al "tirar" de la hoja.
          if (Math.abs(g.vy) > VELOCIDAD_DECISIVA) {
            irA(ORDEN[g.vy < 0 ? Math.min(i + 1, 2) : Math.max(i - 1, 0)], g.vy);
            return;
          }
          if (Math.abs(actual - alto(altura)) < UMBRAL) {
            irA(altura);
            return;
          }
          const cercana = ORDEN.reduce((mejor, a) =>
            Math.abs(alto(a) - actual) < Math.abs(alto(mejor) - actual) ? a : mejor,
          );
          irA(cercana);
        },
        onPanResponderTerminate: () => irA(altura),
      }),
    [altura, irA, y, alto, topeActual],
  );

  return { panHandlers: pan.panHandlers, y, margenInferior, referencia, alMedir };
}

/**
 * Hoja inferior arrastrable.
 *
 * El panel de un paradero no es un cuadro fijo: es la mitad de la pantalla que
 * el usuario negocia con el mapa. Arrastrándola decide cuánto quiere ver de
 * cada cosa, y se queda en las posiciones que tienen sentido en vez de donde
 * quedó el dedo.
 *
 * Va sobre vidrio: el mapa se sigue viendo debajo, que es lo que recuerda que
 * la hoja habla de un punto concreto de ese mapa y no de otra pantalla.
 */
export function Hoja({
  hoja,
  children,
  estilo,
}: {
  hoja: ReturnType<typeof useHoja>;
  children: React.ReactNode;
  estilo?: ViewStyle;
}) {
  const c = useColores();
  const oscuro = useEsOscuro();
  const s = estilos(c);

  const Fondo = Platform.OS === "web" ? View : BlurView;
  const propiedadesFondo =
    Platform.OS === "web"
      ? { style: [StyleSheet.absoluteFill, { backgroundColor: c.vidrio }] }
      : {
          intensity: 60,
          tint: oscuro ? ("dark" as const) : ("light" as const),
          style: StyleSheet.absoluteFill,
        };

  return (
    <Animated.View
      ref={hoja.referencia as never}
      onLayout={hoja.alMedir}
      style={[
        s.hoja,
        elevacion(c, 3),
        { height: hoja.y, bottom: hoja.margenInferior },
        estilo,
      ]}
    >
      {/* El desenfoque deja ver el mapa por debajo: la hoja habla de un punto
          de ese mapa, no de otra pantalla. */}
      <Fondo {...(propiedadesFondo as any)} />
      <View style={s.borde} pointerEvents="none" />

      <View style={s.agarradera}>
        <View style={s.agarre} />
      </View>

      <View style={s.contenido}>{children}</View>
    </Animated.View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    hoja: {
      position: "absolute",
      left: 0,
      right: 0,
      borderTopLeftRadius: radio.xl,
      borderTopRightRadius: radio.xl,
      overflow: "hidden",
      ...(Platform.OS === "web" ? ({ backdropFilter: "blur(24px)" } as object) : null),
    },
    borde: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      borderTopLeftRadius: radio.xl,
      borderTopRightRadius: radio.xl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: c.vidrioBorde,
    },
    agarradera: { paddingTop: 10, paddingBottom: 6, alignItems: "center" },
    agarre: { width: 40, height: 5, borderRadius: 3, backgroundColor: c.borde },
    contenido: { flex: 1, minHeight: 0 },
  });
