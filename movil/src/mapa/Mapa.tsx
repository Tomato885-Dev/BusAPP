import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { elevacion, esp, radio, tipo, useColores, type Colores } from "../tema";
import { TESELA, latAY, lonAX, xALon, yALat } from "./proyeccion";

export interface Marcador {
  id: string;
  lat: number;
  lon: number;
  etiqueta: string;
}

interface Props {
  centroInicial: { lat: number; lon: number };
  zoomInicial?: number;
  marcadores: Marcador[];
  seleccionado?: string | null;
  onSeleccionar?: (id: string) => void;
  irA?: { lat: number; lon: number; zoom?: number; nonce: number } | null;
  margenSuperior?: number;
}

const ZOOM_MIN = 11;
const ZOOM_MAX = 18;
/** Bajo este zoom los paraderos se amontonan y el mapa deja de leerse. */
const ZOOM_MARCADORES = 14;
const MAX_MARCADORES = 140;
/**
 * Anillos de teselas extra fuera de la pantalla.
 *
 * Durante el arrastre no se recalcula la grilla —de eso depende que el gesto
 * sea fluido—, así que hay que tener teselas ya dibujadas hacia donde el dedo
 * pueda mover el mapa. Con un anillo se cubren 256 px de desplazamiento antes
 * de que aparezca borde vacío.
 */
const SOBREMUESTRA = 1;

/**
 * Mapa de teselas propio.
 *
 * No se usa `react-native-maps` ni `expo-maps` porque **ninguno funciona en
 * web**, y la web es como se revisa la app. Esto corre igual en iPhone, Android
 * y navegador, sin módulos nativos ni llaves de API.
 *
 * Teselas de OpenStreetMap: gratuitas y sin registro. Su política de uso está
 * pensada para volúmenes bajos, así que antes de crecer hay que pasar a un
 * proveedor propio (`docs/02-stack-movil.md` §2.3).
 */
export function Mapa({
  centroInicial,
  zoomInicial = 15,
  marcadores,
  seleccionado,
  onSeleccionar,
  irA,
  margenSuperior = esp.md,
}: Props) {
  const c = useColores();
  const s = estilos(c);

  const [centro, setCentro] = useState(centroInicial);
  const [zoom, setZoom] = useState(zoomInicial);
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  const [rotas, setRotas] = useState<Set<string>>(() => new Set());

  /**
   * Desplazamiento del arrastre en curso.
   *
   * Es un valor animado y **no** estado de React: moverlo actualiza el nodo
   * directamente, sin volver a renderizar. Antes el gesto llamaba a `setCentro`
   * en cada evento, lo que rehacía la grilla completa de teselas y marcadores
   * decenas de veces por segundo: de ahí que el mapa se sintiera trabado.
   */
  const desplazamiento = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const gesto = useRef({ dx: 0, dy: 0 });
  const centroActual = useRef(centro);
  centroActual.current = centro;
  const zoomActual = useRef(zoom);
  zoomActual.current = zoom;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // Sólo toma el gesto si hay arrastre real: un toque limpio tiene que
        // llegar al marcador que está debajo.
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
        onPanResponderMove: (_e, g) => {
          gesto.current = { dx: g.dx, dy: g.dy };
          desplazamiento.setValue({ x: g.dx, y: g.dy });
        },
        onPanResponderRelease: () => {
          const z = zoomActual.current;
          const { dx, dy } = gesto.current;
          if (dx === 0 && dy === 0) return;
          const x = lonAX(centroActual.current.lon, z) - dx;
          const y = latAY(centroActual.current.lat, z) - dy;
          gesto.current = { dx: 0, dy: 0 };
          desplazamiento.setValue({ x: 0, y: 0 });
          setCentro({ lat: yALat(y, z), lon: xALon(x, z) });
        },
        onPanResponderTerminate: () => {
          gesto.current = { dx: 0, dy: 0 };
          desplazamiento.setValue({ x: 0, y: 0 });
        },
      }),
    [desplazamiento],
  );

  useEffect(() => {
    if (!irA) return;
    setCentro({ lat: irA.lat, lon: irA.lon });
    if (irA.zoom !== undefined) setZoom(irA.zoom);
  }, [irA?.nonce]);

  const alMedir = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setTamano({ ancho: width, alto: height });
  }, []);

  const cambiarZoom = useCallback((delta: number) => {
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));
  }, []);

  const { ancho, alto } = tamano;
  const listo = ancho > 0 && alto > 0;

  const izquierda = listo ? lonAX(centro.lon, zoom) - ancho / 2 : 0;
  const arriba = listo ? latAY(centro.lat, zoom) - alto / 2 : 0;

  const teselas = useMemo(() => {
    if (!listo) return [];
    const maximo = 2 ** zoom;
    const desdeX = Math.floor(izquierda / TESELA) - SOBREMUESTRA;
    const hastaX = Math.floor((izquierda + ancho) / TESELA) + SOBREMUESTRA;
    const desdeY = Math.max(0, Math.floor(arriba / TESELA) - SOBREMUESTRA);
    const hastaY = Math.min(maximo - 1, Math.floor((arriba + alto) / TESELA) + SOBREMUESTRA);

    const salida: { clave: string; url: string; x: number; y: number }[] = [];
    for (let tx = desdeX; tx <= hastaX; tx++) {
      for (let ty = desdeY; ty <= hastaY; ty++) {
        const envuelto = ((tx % maximo) + maximo) % maximo;
        salida.push({
          clave: `${zoom}/${envuelto}/${ty}`,
          url: `https://tile.openstreetmap.org/${zoom}/${envuelto}/${ty}.png`,
          x: tx * TESELA - izquierda,
          y: ty * TESELA - arriba,
        });
      }
    }
    return salida;
  }, [listo, izquierda, arriba, ancho, alto, zoom]);

  const visibles = useMemo(() => {
    if (!listo || zoom < ZOOM_MARCADORES) return [];
    const margen = TESELA;
    const salida: (Marcador & { x: number; y: number })[] = [];
    for (const m of marcadores) {
      const x = lonAX(m.lon, zoom) - izquierda;
      const y = latAY(m.lat, zoom) - arriba;
      if (x < -margen || x > ancho + margen || y < -margen || y > alto + margen) continue;
      salida.push({ ...m, x, y });
      if (salida.length >= MAX_MARCADORES) break;
    }
    return salida;
  }, [marcadores, listo, zoom, izquierda, arriba, ancho, alto]);

  const movimiento = {
    transform: [
      { translateX: desplazamiento.x },
      { translateY: desplazamiento.y },
    ],
  };

  return (
    <View style={[s.contenedor, { backgroundColor: c.mapaFondo }]} onLayout={alMedir}>
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill, movimiento]}>
          {teselas.map((t) =>
            rotas.has(t.clave) ? null : (
              <Image
                key={t.clave}
                source={{ uri: t.url }}
                style={[s.tesela, { left: t.x, top: t.y }]}
                // Si una tesela no carga, el mapa sigue siendo usable: quedan el
                // fondo y los marcadores encima.
                onError={() => setRotas((r) => new Set(r).add(t.clave))}
              />
            ),
          )}

          {/* Velo que baja la saturación del mapa. El plano es contexto; lo que
              tiene que resaltar son los paraderos. */}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: c.mapaVelo }]}
            pointerEvents="none"
          />

          {visibles.map((m) => {
            const activo = m.id === seleccionado;
            return (
              <Pressable
                key={m.id}
                onPress={() => onSeleccionar?.(m.id)}
                style={[s.marcador, { left: m.x - 15, top: m.y - 15 }]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Paradero ${m.etiqueta}`}
              >
                {activo ? (
                  <View style={[s.globo, elevacion(c, 2)]}>
                    <Text style={s.globoTexto}>{m.etiqueta}</Text>
                  </View>
                ) : null}
                <View
                  style={[
                    s.punto,
                    elevacion(c, 1),
                    activo && { backgroundColor: c.marca, transform: [{ scale: 1.3 }] },
                  ]}
                >
                  <View style={s.puntoInterior} />
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      </View>

      {zoom < ZOOM_MARCADORES ? (
        <View style={[s.pista, { top: margenSuperior }, elevacion(c, 1)]} pointerEvents="none">
          <Text style={s.pistaTexto}>Acércate para ver los paraderos</Text>
        </View>
      ) : null}

      <View style={[s.zoom, { top: margenSuperior }, elevacion(c, 2)]}>
        <Pressable
          onPress={() => cambiarZoom(1)}
          style={s.zoomBoton}
          accessibilityRole="button"
          accessibilityLabel="Acercar"
        >
          <Text style={s.zoomTexto}>+</Text>
        </Pressable>
        <View style={s.zoomLinea} />
        <Pressable
          onPress={() => cambiarZoom(-1)}
          style={s.zoomBoton}
          accessibilityRole="button"
          accessibilityLabel="Alejar"
        >
          <Text style={s.zoomTexto}>−</Text>
        </Pressable>
      </View>

      <Text style={s.credito} pointerEvents="none">
        © OpenStreetMap
      </Text>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    contenedor: { flex: 1, overflow: "hidden" },
    tesela: { position: "absolute", width: TESELA, height: TESELA },

    marcador: {
      position: "absolute",
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    punto: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.texto,
      borderWidth: 2.5,
      borderColor: c.superficie,
      alignItems: "center",
      justifyContent: "center",
    },
    puntoInterior: { width: 4, height: 4, borderRadius: 2, backgroundColor: c.superficie },
    globo: {
      position: "absolute",
      bottom: 24,
      backgroundColor: c.marca,
      paddingHorizontal: esp.sm,
      paddingVertical: 3,
      borderRadius: radio.pastilla,
    },
    globoTexto: { ...tipo.micro, color: "#fff" },

    pista: {
      position: "absolute",
      alignSelf: "center",
      backgroundColor: c.superficie,
      paddingHorizontal: esp.lg,
      paddingVertical: esp.sm,
      borderRadius: radio.pastilla,
    },
    pistaTexto: { ...tipo.menor, color: c.textoSuave },

    zoom: {
      position: "absolute",
      right: esp.md,
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      overflow: "hidden",
    },
    zoomBoton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
    zoomLinea: { height: StyleSheet.hairlineWidth, backgroundColor: c.borde },
    zoomTexto: { fontSize: 22, fontWeight: "600", color: c.texto, lineHeight: 26 },

    credito: { position: "absolute", left: esp.sm, bottom: esp.xs, fontSize: 9, color: c.textoTenue },
  });
