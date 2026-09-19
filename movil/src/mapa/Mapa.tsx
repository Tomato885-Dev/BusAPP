import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  PanResponder,
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
  /**
   * Orden de recentrar. Cambiar el `nonce` mueve el mapa aunque las
   * coordenadas sean las mismas, que es lo que permite volver a centrar en la
   * ubicación del usuario apretando el botón dos veces.
   */
  irA?: { lat: number; lon: number; zoom?: number; nonce: number } | null;
  /** Espacio libre arriba, para que los controles no queden bajo el buscador. */
  margenSuperior?: number;
}

const ZOOM_MIN = 11;
const ZOOM_MAX = 18;
/** Bajo este zoom los paraderos se amontonan y el mapa deja de leerse. */
const ZOOM_MARCADORES = 14;
/** Tope de marcadores dibujados a la vez, para no ahogar el hilo de interfaz. */
const MAX_MARCADORES = 140;

/**
 * Mapa de teselas propio.
 *
 * Se implementa a mano en vez de usar `react-native-maps` o `expo-maps` por una
 * razón concreta: **ninguno de los dos funciona en web**, y la web es como el
 * equipo revisa la app hoy. Esto corre igual en iPhone, Android y navegador,
 * sin módulos nativos ni llaves de API.
 *
 * Las teselas son de CARTO sobre datos de OpenStreetMap, gratuitas para uso
 * razonable. Al crecer habrá que pasar a un proveedor propio
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
  const oscuro = useEsOscuro();
  const s = estilos(c);

  const [centro, setCentro] = useState(centroInicial);
  const [zoom, setZoom] = useState(zoomInicial);
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });
  const [rotas, setRotas] = useState<Set<string>>(() => new Set());

  // Refs para que el gesto lea siempre el valor vigente sin recrear el responder.
  const centroActual = useRef(centro);
  centroActual.current = centro;
  const zoomActual = useRef(zoom);
  zoomActual.current = zoom;
  const centroAlTomar = useRef(centroInicial);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // Sólo toma el gesto si hay arrastre real: un toque limpio tiene que
        // llegar al marcador que está debajo.
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
        onPanResponderGrant: () => {
          centroAlTomar.current = centroActual.current;
        },
        onPanResponderMove: (_e, g) => {
          const z = zoomActual.current;
          const x = lonAX(centroAlTomar.current.lon, z) - g.dx;
          const y = latAY(centroAlTomar.current.lat, z) - g.dy;
          setCentro({ lat: yALat(y, z), lon: xALon(x, z) });
        },
      }),
    [],
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

  // Esquina superior izquierda del viewport, en píxeles de mundo.
  const izquierda = listo ? lonAX(centro.lon, zoom) - ancho / 2 : 0;
  const arriba = listo ? latAY(centro.lat, zoom) - alto / 2 : 0;

  const teselas = useMemo(() => {
    if (!listo) return [];
    const maximo = 2 ** zoom;
    const desdeX = Math.floor(izquierda / TESELA);
    const hastaX = Math.floor((izquierda + ancho) / TESELA);
    const desdeY = Math.max(0, Math.floor(arriba / TESELA));
    const hastaY = Math.min(maximo - 1, Math.floor((arriba + alto) / TESELA));

    const salida: { clave: string; url: string; x: number; y: number }[] = [];
    for (let tx = desdeX; tx <= hastaX; tx++) {
      for (let ty = desdeY; ty <= hastaY; ty++) {
        const envuelto = ((tx % maximo) + maximo) % maximo;
        const paleta = oscuro ? "dark_all" : "light_all";
        const sub = "abc"[Math.abs(envuelto + ty) % 3];
        salida.push({
          clave: `${paleta}/${zoom}/${envuelto}/${ty}`,
          url: `https://${sub}.basemaps.cartocdn.com/${paleta}/${zoom}/${envuelto}/${ty}@2x.png`,
          x: tx * TESELA - izquierda,
          y: ty * TESELA - arriba,
        });
      }
    }
    return salida;
  }, [listo, izquierda, arriba, ancho, alto, zoom, oscuro]);

  const visibles = useMemo(() => {
    if (!listo || zoom < ZOOM_MARCADORES) return [];
    const margen = 60;
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

  return (
    <View style={[s.contenedor, { backgroundColor: c.mapaFondo }]} onLayout={alMedir}>
      <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
        {teselas.map((t) =>
          rotas.has(t.clave) ? null : (
            <Image
              key={t.clave}
              source={{ uri: t.url }}
              style={[s.tesela, { left: t.x, top: t.y }]}
              // Si las teselas no cargan (sin red, proveedor caído), el mapa
              // sigue siendo usable: queda el fondo y los marcadores encima.
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
                  activo && {
                    backgroundColor: c.marca,
                    transform: [{ scale: 1.3 }],
                  },
                ]}
              >
                <View style={s.puntoInterior} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {zoom < ZOOM_MARCADORES ? (
        <View style={[s.pista, { top: margenSuperior }, elevacion(c, 1)]}>
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

      <Text style={s.credito}>© OpenStreetMap · CARTO</Text>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    contenedor: { flex: 1, overflow: "hidden" },
    tesela: { position: "absolute", width: TESELA, height: TESELA },

    marcador: { position: "absolute", width: 30, height: 30, alignItems: "center", justifyContent: "center" },
    punto: {
      width: 17,
      height: 17,
      borderRadius: 9,
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
