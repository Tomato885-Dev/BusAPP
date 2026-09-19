import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Vacio } from "../../src/componentes/Vacio";
import { Mapa, type Marcador, type Trazado } from "../../src/mapa/Mapa";
import {
  estaOperando,
  intervaloOficial,
  NOMBRE_DE_TIPO,
  PARADERO_POR_ID,
  RECORRIDO_POR_ID,
} from "../../src/red";
import { esp, fuente, radio, tipo, useColores, type Colores } from "../../src/tema";

/** Cuántas paradas se listan antes de cortar. */
const MAX_LISTADAS = 80;

/** Alto del mapa dentro de la pantalla, y ancho aproximado descontando márgenes. */
const ALTO_MAPA = 320;
const ANCHO_MAPA = 360;
/** Lado de una tesela, que es la unidad del cálculo de zoom. */
const TESELA = 256;
/** No se acerca más que esto aunque el recorrido sea cortísimo. */
const ZOOM_TOPE = 15;

/** Coordenada Y normalizada de Web Mercator, entre 0 y 1. */
function mercatorY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
}

export default function PantallaLinea() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColores();
  const s = estilos(c);

  const recorrido = RECORRIDO_POR_ID.get(id);

  const paradas = useMemo(
    () =>
      recorrido
        ? recorrido.paradas
            .map((pid) => PARADERO_POR_ID.get(pid))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))
        : [],
    [recorrido],
  );

  const trazado = useMemo<Trazado | null>(
    () =>
      paradas.length >= 2
        ? { puntos: paradas.map((p) => ({ lat: p.lat, lon: p.lon })), color: c.marca }
        : null,
    [paradas, c.marca],
  );

  // El mapa se encuadra para que el recorrido quepa entero y llene la vista.
  // Un zoom elegido a ojo dejaba la línea como un hilo en medio del gris.
  const encuadre = useMemo(() => {
    if (paradas.length === 0) return { centro: { lat: -33.4429, lon: -70.6539 }, zoom: 11 };

    const lats = paradas.map((p) => p.lat);
    const lons = paradas.map((p) => p.lon);
    const centro = {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lon: (Math.min(...lons) + Math.max(...lons)) / 2,
    };

    // Proporción del mundo, en Web Mercator, que ocupa el recorrido.
    const anchoMundo = (Math.max(...lons) - Math.min(...lons)) / 360;
    const altoMundo = Math.abs(mercatorY(Math.max(...lats)) - mercatorY(Math.min(...lats)));

    // El zoom que hace que esa proporción ocupe el 82% del recuadro. Se toma el
    // menor de los dos ejes, que es el que decide si algo se sale.
    const cabe = (fraccion: number, pixeles: number) =>
      fraccion <= 0
        ? ZOOM_TOPE
        : Math.log2((0.82 * pixeles) / (TESELA * fraccion));

    const zoom = Math.max(
      9,
      Math.min(ZOOM_TOPE, Math.floor(Math.min(cabe(anchoMundo, ANCHO_MAPA), cabe(altoMundo, ALTO_MAPA)))),
    );
    return { centro, zoom };
  }, [paradas]);

  if (!recorrido) {
    return (
      <>
        <Stack.Screen options={{ title: "Línea" }} />
        <Vacio titulo="No encontramos esa línea" />
      </>
    );
  }

  const activa = estaOperando(recorrido);
  const intervalo = intervaloOficial(recorrido);
  const marcadores: Marcador[] = paradas.map((p) => ({
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    etiqueta: p.codigo,
  }));

  return (
    <>
      <Stack.Screen options={{ title: `${NOMBRE_DE_TIPO[recorrido.tipo]} ${recorrido.nombre}` }} />
      <ScrollView style={s.pantalla} contentContainerStyle={{ paddingBottom: esp.xxl }}>
        <View style={s.cabecera}>
          <View style={[s.insignia, !activa && { backgroundColor: c.neutro }]}>
            <Text style={s.insigniaTexto}>{recorrido.nombre}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.destino} numberOfLines={2}>
              {recorrido.destino}
            </Text>
            <View style={s.estadoFila}>
              <View style={[s.punto, { backgroundColor: activa ? c.ok : c.neutro }]} />
              <Text style={[s.estado, { color: activa ? c.ok : c.textoTenue }]}>
                {activa && intervalo !== null
                  ? `En servicio · pasa cada ${Math.round(intervalo / 60)} min`
                  : "Fuera de servicio a esta hora"}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.mapa}>
          <Mapa
            centroInicial={encuadre.centro}
            zoomInicial={encuadre.zoom}
            marcadores={marcadores}
            trazado={trazado}
            marcadoresSiempre
            onSeleccionar={(pid) =>
              router.push({ pathname: "/paradero/[id]", params: { id: pid } })
            }
          />
        </View>

        <Text style={s.seccion}>
          {paradas.length} {paradas.length === 1 ? "parada" : "paradas"}
        </Text>

        <View style={s.lista}>
          {paradas.slice(0, MAX_LISTADAS).map((p, i) => (
            <Pressable
              key={`${p.id}-${i}`}
              style={s.parada}
              onPress={() => router.push({ pathname: "/paradero/[id]", params: { id: p.id } })}
              accessibilityRole="button"
            >
              <View style={s.riel}>
                <View style={[s.nodo, { borderColor: c.marca }]} />
                {i < Math.min(paradas.length, MAX_LISTADAS) - 1 ? (
                  <View style={[s.trazo, { backgroundColor: c.marca }]} />
                ) : null}
              </View>
              <Text style={s.paradaNombre} numberOfLines={1}>
                {p.nombre}
              </Text>
            </Pressable>
          ))}
          {paradas.length > MAX_LISTADAS ? (
            <Text style={s.mas}>
              y {paradas.length - MAX_LISTADAS} paradas más
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },

    cabecera: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.md,
      padding: esp.lg,
    },
    insignia: {
      minWidth: 58,
      paddingHorizontal: esp.sm,
      height: 36,
      borderRadius: radio.sm,
      backgroundColor: c.texto,
      alignItems: "center",
      justifyContent: "center",
    },
    insigniaTexto: { ...tipo.subtitulo, color: c.textoInverso },
    destino: { ...tipo.cuerpoFuerte, color: c.texto },
    estadoFila: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
    punto: { width: 6, height: 6, borderRadius: 3 },
    estado: { ...tipo.menor },

    mapa: {
      height: 320,
      marginHorizontal: esp.lg,
      borderRadius: radio.md,
      overflow: "hidden",
      backgroundColor: c.mapaFondo,
    },

    seccion: {
      ...tipo.micro,
      color: c.textoTenue,
      textTransform: "uppercase",
      marginTop: esp.xl,
      marginBottom: esp.sm,
      marginHorizontal: esp.lg,
    },
    lista: { paddingHorizontal: esp.lg },
    parada: { flexDirection: "row", alignItems: "flex-start", gap: esp.md },
    riel: { width: 12, alignItems: "center" },
    nodo: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2.5,
      backgroundColor: c.fondo,
      marginTop: 5,
    },
    trazo: { flex: 1, width: 2, marginVertical: 2 },
    paradaNombre: { ...tipo.cuerpo, color: c.texto, flex: 1, paddingBottom: esp.md },
    mas: { ...tipo.menor, color: c.textoTenue, marginTop: esp.sm, marginLeft: 24 },
  });
