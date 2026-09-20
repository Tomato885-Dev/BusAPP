import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import Svg, { Polyline } from "react-native-svg";

import { type Colores, elevacion, esp, fuente, radio, tipo, useColores, useEsOscuro } from "../tema";
import { TESELA, latAY, lonAX, xALon, yALat } from "./proyeccion";

export interface Marcador {
  id: string;
  lat: number;
  lon: number;
  etiqueta: string;
}

/** Una línea dibujada sobre el mapa: el recorrido de una micro o del Metro. */
export interface Trazado {
  puntos: { lat: number; lon: number }[];
  color: string;
}

interface Props {
  centroInicial: { lat: number; lon: number };
  zoomInicial?: number;
  marcadores: Marcador[];
  /** Recorrido dibujado encima de las teselas. */
  trazado?: Trazado | null;
  /** Dibuja los marcadores en cualquier zoom, para ver una línea completa. */
  marcadoresSiempre?: boolean;
  /**
   * Qué escribir encima de cada paradero, de cerca.
   *
   * Se llama **sólo para los que están en pantalla**, que son unas decenas.
   * Calcularlo para los 3.748 paraderos sería tirar trabajo a la basura.
   */
  insignia?: (id: string) => string | null;
  seleccionado?: string | null;
  onSeleccionar?: (id: string) => void;
  irA?: { lat: number; lon: number; zoom?: number; nonce: number } | null;
  margenSuperior?: number;
}

const ZOOM_MIN = 11;
/** Bajo este zoom los paraderos se amontonan y el mapa deja de leerse. */
const ZOOM_MARCADORES = 14;
/** Desde aquí cabe escribir los minutos encima de cada paradero. */
const ZOOM_INSIGNIAS = 16;
/** Espacio que reserva cada insignia, para que dos no se pisen. */
const ANCHO_INSIGNIA = 46;
const ALTO_INSIGNIA = 28;
const MAX_MARCADORES = 140;
/**
 * Anillos de teselas extra fuera de la pantalla.
 *
 * Durante el arrastre no se recalcula la grilla —de eso depende que el gesto
 * sea fluido—, así que hay que tener teselas ya dibujadas hacia donde el dedo
 * pueda mover el mapa. Con dos anillos se cubren 512 px, que es lo que alcanza
 * a recorrer un envión antes de que el mapa se frene.
 */
const SOBREMUESTRA = 2;

/**
 * Cuánto puede alejarse el mapa de su grilla antes de rehacerla.
 *
 * Es el margen que dan los anillos de reserva, con holgura: pasado esto
 * aparecería borde vacío, así que conviene fijar el centro y redibujar.
 */
const LIMITE_ARRASTRE = TESELA * SOBREMUESTRA * 0.9;

/** Cuánto frena el envión. Más cerca de 1, más largo el deslizamiento. */
const FRENADO = 0.995;

/*
 * El recorrido de un envión es aproximadamente `velocidad / (1 - frenado)`.
 * De ahí sale cuánta velocidad se puede permitir para que quepa en el margen
 * de teselas disponible: más vale un envión algo más corto que uno que se
 * frena de golpe al quedarse sin mapa.
 */

/** Lado de la celda del índice de marcadores, en grados. Unos 300 m. */
const CELDA = 0.003;

/**
 * Proveedor de teselas.
 *
 * Con llave de Stadia se usa su estilo «Alidade Smooth»: limpio, de colores
 * suaves y con pocas etiquetas, que es lo más cercano al aspecto de Mapas de
 * Apple disponible para iPhone, Android y web a la vez.
 *
 * Sin llave cae a los planos Canvas de Esri, que no requieren registro. Así la
 * app nunca se queda sin mapa por una credencial faltante.
 */
const LLAVE_STADIA = process.env.EXPO_PUBLIC_STADIA_API_KEY;

function urlDeTesela(zoom: number, x: number, y: number, oscuro: boolean): string {
  if (LLAVE_STADIA) {
    const estilo = oscuro ? "alidade_smooth_dark" : "alidade_smooth";
    return `https://tiles.stadiamaps.com/tiles/${estilo}/${zoom}/${x}/${y}@2x.png?api_key=${LLAVE_STADIA}`;
  }
  const plano = oscuro ? "World_Dark_Gray_Base" : "World_Light_Gray_Base";
  return `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/${plano}/MapServer/tile/${zoom}/${y}/${x}`;
}

/**
 * Hasta dónde se puede acercar.
 *
 * **No es una preferencia, es un límite del proveedor.** Los planos Canvas de
 * Esri sólo tienen teselas hasta el zoom 16: más allá devuelven una imagen gris
 * que dice «Map data not yet available», y el mapa parece roto. Stadia llega
 * bastante más lejos.
 */
const ZOOM_MAX = LLAVE_STADIA ? 19 : 16;

const CREDITO = LLAVE_STADIA
  ? "© Stadia Maps · OpenMapTiles · OpenStreetMap"
  : "Esri · OpenStreetMap";

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
  trazado = null,
  marcadoresSiempre = false,
  insignia,
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

  /**
   * Cuánto del gesto en curso ya se trasladó al centro del mapa.
   *
   * Un arrastre largo obliga a rehacer la grilla a mitad del gesto, o se acaban
   * las teselas de reserva. El problema es que `dx` sigue contando desde donde
   * se apoyó el dedo: si se recentra sin descontarlo, el siguiente movimiento
   * vuelve a aplicar todo el recorrido y el mapa pega un salto. Esto guarda lo
   * ya aplicado para restarlo.
   */
  const aplicado = useRef({ x: 0, y: 0 });

  /** Traslada el centro por el desplazamiento dado y vuelve el lienzo a cero. */
  const fijarCentro = useCallback((dx: number, dy: number) => {
    if (dx === 0 && dy === 0) return;
    const z = zoomActual.current;
    const x = lonAX(centroActual.current.lon, z) - dx;
    const y = latAY(centroActual.current.lat, z) - dy;
    gesto.current = { dx: 0, dy: 0 };
    // El lienzo **no** se pone en cero aquí. Ponerlo ahora deja un cuadro con
    // la grilla vieja ya sin desplazamiento —un salto de cientos de píxeles—,
    // porque el nuevo centro recién llega en el render siguiente. Se anota y
    // se hace justo después de ese render, antes de que la pantalla se pinte.
    porCentrar.current = true;
    setCentro({ lat: yALat(y, z), lon: xALon(x, z) });
  }, []);

  const porCentrar = useRef(false);

  useLayoutEffect(() => {
    if (!porCentrar.current) return;
    porCentrar.current = false;
    desplazamiento.setValue({ x: 0, y: 0 });
  }, [centro, desplazamiento]);

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
        onPanResponderGrant: () => {
          // Un dedo nuevo corta el deslizamiento en curso: si no, el mapa sigue
          // corriendo bajo el dedo que intenta detenerlo.
          desplazamiento.stopAnimation();
          desplazamiento.setValue({ x: 0, y: 0 });
          gesto.current = { dx: 0, dy: 0 };
          aplicado.current = { x: 0, y: 0 };
        },
        onPanResponderMove: (_e, g) => {
          const dx = g.dx - aplicado.current.x;
          const dy = g.dy - aplicado.current.y;
          gesto.current = { dx, dy };
          desplazamiento.setValue({ x: dx, y: dy });

          // Arrastre largo: se recentra sin soltar el gesto, anotando lo ya
          // aplicado. Para el dedo no pasa nada; por debajo se rehace la grilla
          // antes de quedarse sin teselas.
          if (Math.abs(dx) > LIMITE_ARRASTRE || Math.abs(dy) > LIMITE_ARRASTRE) {
            aplicado.current = { x: g.dx, y: g.dy };
            fijarCentro(dx, dy);
          }
        },
        onPanResponderRelease: (_e, g) => {
          const { dx, dy } = gesto.current;
          if (dx === 0 && dy === 0) return;

          // Un mapa que se detiene en seco donde se levanta el dedo se siente
          // tosco. El envión sigue corriendo y frena solo.
          const rapido = Math.abs(g.vx) > 0.12 || Math.abs(g.vy) > 0.12;
          if (!rapido) {
            fijarCentro(dx, dy);
            return;
          }

          // El envión arranca desde donde quedó el dedo, así que lo que queda
          // de margen es el límite **menos lo ya desplazado**. Sin descontarlo,
          // un arrastre largo seguido de envión se sale igual de las teselas.
          const recortar = (v: number, yaRecorrido: number) => {
            const margen = Math.max(0, LIMITE_ARRASTRE - Math.abs(yaRecorrido));
            const tope = margen * (1 - FRENADO);
            return Math.sign(v) * Math.min(Math.abs(v), tope);
          };

          Animated.decay(desplazamiento, {
            velocity: { x: recortar(g.vx, dx), y: recortar(g.vy, dy) },
            deceleration: FRENADO,
            useNativeDriver: false,
          }).start(() => fijarCentro(gesto.current.dx, gesto.current.dy));
        },
        onPanResponderTerminate: () => {
          desplazamiento.stopAnimation();
          fijarCentro(gesto.current.dx, gesto.current.dy);
        },
      }),
    [desplazamiento, fijarCentro],
  );

  // El lienzo se mueve solo durante el envión, así que hay que saber dónde
  // quedó para poder fijar el centro al terminar.
  useEffect(() => {
    const ix = desplazamiento.x.addListener(({ value }) => {
      gesto.current.dx = value;
    });
    const iy = desplazamiento.y.addListener(({ value }) => {
      gesto.current.dy = value;
    });
    return () => {
      desplazamiento.x.removeListener(ix);
      desplazamiento.y.removeListener(iy);
    };
  }, [desplazamiento]);


  useEffect(() => {
    if (!irA) return;
    setCentro({ lat: irA.lat, lon: irA.lon });
    if (irA.zoom !== undefined) {
      setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, irA.zoom)));
    }
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
          clave: `${oscuroActivo ? "o" : "c"}/${zoom}/${envuelto}/${ty}`,
          url: urlDeTesela(zoom, envuelto, ty, oscuroActivo),
          x: tx * TESELA - izquierda,
          y: ty * TESELA - arriba,
        });
      }
    }
    return salida;
  }, [listo, izquierda, arriba, ancho, alto, zoom, oscuroActivo]);

  // El trazado se recalcula igual que los marcadores. No se recorta a la
  // pantalla: una línea cortada en el borde se ve peor que una que se sale.
  const trazadoEnPantalla = useMemo(() => {
    if (!listo || !trazado || trazado.puntos.length < 2) return null;
    return trazado.puntos
      .map((p) => `${lonAX(p.lon, zoom) - izquierda},${latAY(p.lat, zoom) - arriba}`)
      .join(" ");
  }, [trazado, listo, zoom, izquierda, arriba]);

  /**
   * Los marcadores repartidos en celdas de un cuarto de grado de minuto.
   *
   * Sin esto, cada vez que el mapa se mueve hay que recorrer los 4.677
   * paraderos para saber cuáles caen en pantalla. Pasa en cada arrastre, y es
   * justo el momento en que no sobra tiempo.
   */
  const rejilla = useMemo(() => {
    const celdas = new Map<string, Marcador[]>();
    for (const m of marcadores) {
      const k = `${Math.floor(m.lat / CELDA)}:${Math.floor(m.lon / CELDA)}`;
      const lista = celdas.get(k);
      if (lista) lista.push(m);
      else celdas.set(k, [m]);
    }
    return celdas;
  }, [marcadores]);

  const visibles = useMemo(() => {
    if (!listo || (zoom < ZOOM_MARCADORES && !marcadoresSiempre)) return [];
    const margen = TESELA;
    const conInsignias = zoom >= ZOOM_INSIGNIAS && Boolean(insignia);

    // Cajas ya ocupadas por una insignia. Sin esto los minutos se pisan entre
    // ellos en cuanto hay dos paraderos juntos, que en el centro es siempre, y
    // el mapa se vuelve ilegible justo donde más paraderos hay.
    const ocupadas: { x: number; y: number }[] = [];
    const chocaCon = (x: number, y: number) =>
      ocupadas.some(
        (o) => Math.abs(o.x - x) < ANCHO_INSIGNIA && Math.abs(o.y - y) < ALTO_INSIGNIA,
      );

    // Recuadro visible, con margen, traducido a coordenadas geográficas para
    // poder preguntarle a la rejilla en vez de recorrerlo todo.
    const oeste = xALon(izquierda - margen, zoom);
    const este = xALon(izquierda + ancho + margen, zoom);
    const norte = yALat(arriba - margen, zoom);
    const sur = yALat(arriba + alto + margen, zoom);

    const candidatos: Marcador[] = [];
    for (let f = Math.floor(sur / CELDA); f <= Math.floor(norte / CELDA); f++) {
      for (let col = Math.floor(oeste / CELDA); col <= Math.floor(este / CELDA); col++) {
        const lista = rejilla.get(`${f}:${col}`);
        if (lista) candidatos.push(...lista);
      }
    }

    const salida: (Marcador & { x: number; y: number; insigniaTexto: string | null })[] = [];
    for (const m of candidatos) {
      const x = lonAX(m.lon, zoom) - izquierda;
      const y = latAY(m.lat, zoom) - arriba;
      if (x < -margen || x > ancho + margen || y < -margen || y > alto + margen) continue;

      let insigniaTexto: string | null = null;
      if (conInsignias && m.id !== seleccionado && !chocaCon(x, y)) {
        insigniaTexto = insignia!(m.id);
        if (insigniaTexto) ocupadas.push({ x, y });
      }

      salida.push({ ...m, x, y, insigniaTexto });
      if (salida.length >= MAX_MARCADORES) break;
    }
    return salida;
  }, [
    rejilla,
    listo,
    zoom,
    izquierda,
    arriba,
    ancho,
    alto,
    marcadoresSiempre,
    insignia,
    seleccionado,
  ]);

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

          {trazadoEnPantalla ? (
            <Svg
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
              width={ancho}
              height={alto}
            >
              {/* Dos trazos: uno claro y grueso debajo, para que la línea se lea
                  igual sobre un plano con calles del mismo tono. */}
              <Polyline
                points={trazadoEnPantalla}
                fill="none"
                stroke={c.superficie}
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points={trazadoEnPantalla}
                fill="none"
                stroke={trazado!.color}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          ) : null}

          {visibles.map((m) => {
            const activo = m.id === seleccionado;
            // Al mostrar una línea completa las paradas van casi pegadas, y un
            // marcador de tamaño normal taparía el trazado que uno vino a ver.
            if (marcadoresSiempre && !activo) {
              return (
                <Pressable
                  key={m.id}
                  onPress={() => onSeleccionar?.(m.id)}
                  style={[s.marcadorChico, { left: m.x - 11, top: m.y - 11 }]}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={`Parada ${m.etiqueta}`}
                >
                  <View style={[s.puntoChico, { borderColor: c.marca }]} />
                </Pressable>
              );
            }
            // De cerca, el paradero muestra en cuántos minutos viene la
            // próxima micro. Es el dato que la persona vino a buscar, y verlo
            // sin abrir nada ahorra el toque que todas las demás apps piden.
            const minutos = m.insigniaTexto;
            if (minutos && !activo) {
              return (
                <Pressable
                  key={m.id}
                  onPress={() => onSeleccionar?.(m.id)}
                  style={[s.marcador, { left: m.x - 19, top: m.y - 15 }]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Paradero ${m.etiqueta}, próxima micro en ${minutos}`}
                >
                  <View style={[s.pastillaMin, elevacion(c, 1)]}>
                    <Text style={s.pastillaMinTexto}>{minutos}</Text>
                  </View>
                </Pressable>
              );
            }

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

      {zoom < ZOOM_MARCADORES && !marcadoresSiempre ? (
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
        {CREDITO}
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
    pastillaMin: {
      minWidth: 32,
      paddingHorizontal: 7,
      height: 24,
      borderRadius: radio.pastilla,
      backgroundColor: c.superficie,
      borderWidth: 2,
      borderColor: c.marca,
      alignItems: "center",
      justifyContent: "center",
    },
    pastillaMinTexto: { ...tipo.menor, fontFamily: fuente.fuerte, color: c.marca },
    marcadorChico: {
      position: "absolute",
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    puntoChico: {
      width: 9,
      height: 9,
      borderRadius: 5,
      borderWidth: 2.5,
      backgroundColor: c.superficie,
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
      backgroundColor: c.vidrio,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.vidrioBorde,
      borderRadius: radio.md,
      overflow: "hidden",
      ...(Platform.OS === "web" ? ({ backdropFilter: "blur(20px)" } as object) : null),
    },
    zoomBoton: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
    zoomLinea: { height: StyleSheet.hairlineWidth, backgroundColor: c.borde },
    zoomTexto: { fontFamily: fuente.semi, fontSize: 22, color: c.texto, lineHeight: 26 },

    credito: { position: "absolute", left: esp.sm, bottom: esp.xs, fontSize: 9, color: c.textoTenue },
  });
