import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { elevacion, esp, radio, tipo, useColores, useEsOscuro, type Colores } from "../tema";
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

const RAIZ_TESELAS = "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas";
const PLANO_CLARO = "World_Light_Gray_Base";
const PLANO_OSCURO = "World_Dark_Gray_Base";

/**
 * Mapa de teselas propio.
 *
 * No se usa `react-native-maps` ni `expo-maps` porque **ninguno funciona en
 * web**, y la web es como se revisa la app. Esto corre igual en iPhone, Android
 * y navegador, sin módulos nativos ni llaves de API.
 *
 * Las teselas son los fondos «Canvas» de Esri: planos deliberadamente sobrios,
 * sin comercios, sin íconos y con muy pocas etiquetas. El mapa aquí es
 * **contexto**, no el contenido: lo que tiene que resaltar son los paraderos.
 * El fondo estándar de OpenStreetMap trae toda la información de la ciudad
 * encima y compite con los marcadores.
 *
 * Vienen en variante clara y oscura, de modo que el modo oscuro es un plano
 * pensado para eso y no una capa oscura sobre un mapa claro.
 *
 * Sirven para desarrollar; **antes de lanzar hay que contratar un proveedor**
 * (`docs/02-stack-movil.md` §2.3).
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
  const oscuroActivo = useEsOscuro();
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
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        // Una vez tomado el gesto no se suelta: sin esto, cualquier vista de
        // arriba puede arrebatarlo a mitad del arrastre y el mapa se traba.
        onPanResponderTerminationRequest: () => false,
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

  const plano = oscuroActivo ? PLANO_OSCURO : PLANO_CLARO;

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
        // Ojo con el orden: ArcGIS sirve {z}/{y}/{x}, no {z}/{x}/{y}.
        salida.push({
          clave: `${plano}/${zoom}/${envuelto}/${ty}`,
          url: `${RAIZ_TESELAS}/${plano}/MapServer/tile/${zoom}/${ty}/${envuelto}`,
          x: tx * TESELA - izquierda,
          y: ty * TESELA - arriba,
        });
      }
    }
    return salida;
  }, [listo, izquierda, arriba, ancho, alto, zoom, plano]);

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
      <View style={[StyleSheet.absoluteFill, s.lienzo]} {...pan.panHandlers}>
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
        Esri · OpenStreetMap
      </Text>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    contenedor: { flex: 1, overflow: "hidden" },
    /**
     * En web el navegador maneja el toque por su cuenta —desplaza la página,
     * hace zoom, selecciona texto— y compite con el arrastre del mapa. Ese
     * forcejeo es lo que se siente tosco al deslizar el dedo. `touchAction`
     * le cede el gesto por completo a la aplicación.
     */
    lienzo: Platform.OS === "web"
      ? ({
          touchAction: "none",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
          cursor: "grab",
        } as object)
      : {},
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
