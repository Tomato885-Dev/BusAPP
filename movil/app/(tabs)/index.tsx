import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { llegadasDeParadero } from "../../src/api";
import { FilaLlegada } from "../../src/componentes/FilaLlegada";
import { TarjetaRutina } from "../../src/componentes/TarjetaRutina";
import { useFavoritos } from "../../src/favoritos";
import { usePremium } from "../../src/premium";
import { useRutinas } from "../../src/rutinas";
import { AvisoDemo } from "../../src/componentes/AvisoDemo";
import { Respuesta } from "../../src/componentes/Respuesta";
import { TarjetaAviso } from "../../src/componentes/TarjetaAviso";
import { Hoja, useHoja, type Altura } from "../../src/componentes/Hoja";
import { Mapa, type Marcador } from "../../src/mapa/Mapa";
import { PARADEROS, PARADERO_POR_ID } from "../../src/red";
import { elevacion, esp, fuente, radio, tipo, useColores, type Colores } from "../../src/tema";

/** La Moneda: centro de Santiago, buen punto de partida. */
const CENTRO = { lat: -33.4429, lon: -70.6539 };

export default function PantallaMapa() {
  const c = useColores();
  const insets = useSafeAreaInsets();
  const { height: alto } = useWindowDimensions();
  const s = estilos(c);

  const { esFavorito, alternar } = useFavoritos();
  const { rutinaActiva, minutosParaSalir } = useRutinas();
  const { esPremium } = usePremium();
  const { paraderoId } = useLocalSearchParams<{ paraderoId?: string }>();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  // La hoja se abre asomada: lo primero es la respuesta, y el mapa sigue a la
  // vista para entender de qué paradero se habla.
  const [altura, setAltura] = useState<Altura>("asomada");
  // El contenedor de la pestaña ya excluye la barra inferior, así que la hoja
  // se apoya en su fondo y mide sus posiciones contra ese alto y no el de la
  // pantalla completa.
  const hoja = useHoja({
    altura,
    onAltura: setAltura,
    altoDisponible: alto - ALTO_PESTANAS - insets.bottom,
  });
  const [irA, setIrA] = useState<{ lat: number; lon: number; zoom?: number; nonce: number } | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  // Al llegar desde otra pantalla ("Ver en el mapa") se abre ese paradero y se
  // centra el mapa en él. El ref evita reabrirlo si el usuario lo cierra y el
  // parámetro sigue en la ruta.
  const ultimoParametro = useRef<string | null>(null);
  useEffect(() => {
    if (!paraderoId || paraderoId === ultimoParametro.current) return;
    const p = PARADERO_POR_ID.get(paraderoId);
    if (!p) return;
    ultimoParametro.current = paraderoId;
    setSeleccionado(paraderoId);
    setAltura("asomada");
    setIrA({ lat: p.lat, lon: p.lon, zoom: 17, nonce: Date.now() });
  }, [paraderoId]);

  const marcadores: Marcador[] = useMemo(
    () => PARADEROS.map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, etiqueta: p.codigo })),
    [],
  );

  const paradero = seleccionado ? PARADERO_POR_ID.get(seleccionado) : null;
  const datos = useMemo(
    () => (seleccionado ? llegadasDeParadero(seleccionado) : null),
    [seleccionado],
  );

  // Los minutos que van encima de cada paradero en el mapa. El mapa sólo la
  // llama para los que están en pantalla, así que el costo es de decenas de
  // paraderos, no de miles.
  const insigniaDe = useCallback((paraderoId: string) => {
    const datos = llegadasDeParadero(paraderoId);
    const proxima = datos.llegadas.find(
      (l) => l.estado !== "no_llegara" && l.etaSegundos !== null,
    );
    if (!proxima) return null;
    const min = Math.round(proxima.etaSegundos! / 60);
    return min <= 0 ? "ya" : `${min}′`;
  }, []);

  const irAMiUbicacion = useCallback(async () => {
    setBuscandoUbicacion(true);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      setIrA({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        zoom: 16,
        nonce: Date.now(),
      });
    } catch {
      // Sin ubicación la app sigue sirviendo: el mapa se explora a mano.
    } finally {
      setBuscandoUbicacion(false);
    }
  }, []);

  return (
    <View style={s.pantalla} {...hoja.panHandlers}>
      <Mapa
        centroInicial={CENTRO}
        zoomInicial={16}
        marcadores={marcadores}
        seleccionado={seleccionado}
        onSeleccionar={setSeleccionado}
        insignia={insigniaDe}
        irA={irA}
        margenSuperior={insets.top + esp.sm + ALTO_BUSCADOR + esp.md}
      />

      <View style={[s.superior, { top: insets.top + esp.sm }]}>
        <Pressable
          style={[s.buscador, elevacion(c, 2)]}
          onPress={() => router.push("/llegar")}
          accessibilityRole="button"
        >
          <Text style={s.lupa}>⌕</Text>
          <Text style={s.buscadorTexto}>Buscar paradero o destino</Text>
        </Pressable>

        {/* La rutina aparece sola cuando falta poco para la hora habitual.
            Es lo que después será el widget de la pantalla de inicio. */}
        {esPremium && rutinaActiva && minutosParaSalir !== null && !paradero ? (
          <View style={{ marginTop: esp.md }}>
            <TarjetaRutina
              rutina={rutinaActiva}
              minutosParaSalir={minutosParaSalir}
              onAbrir={() => setSeleccionado(rutinaActiva.paraderoId)}
            />
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={irAMiUbicacion}
        style={[
          s.ubicacion,
          elevacion(c, 2),
          // La hoja asomada ocupa un tercio de la pantalla; el botón se apoya
          // justo encima para no quedar tapado.
          { bottom: (paradero ? (alto - ALTO_PESTANAS - insets.bottom) * 0.34 : 0) + esp.lg },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Ir a mi ubicación"
      >
        <Text style={s.ubicacionIcono}>{buscandoUbicacion ? "…" : "⌖"}</Text>
      </Pressable>

      {paradero && datos ? (
        <Hoja hoja={hoja}>
          <View style={s.panelCabecera}>
            <View style={s.panelTitulos}>
              <Text style={s.panelNombre} numberOfLines={altura === "asomada" ? 1 : 2}>
                {paradero.nombre}
              </Text>
              <View style={s.panelMetaFila}>
                <View style={s.pulso} />
                <Text style={s.panelMeta}>
                  {paradero.codigo} · hace {datos.actualizadoHace} s
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => alternar(paradero.id)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={
                esFavorito(paradero.id) ? "Quitar de favoritos" : "Guardar en favoritos"
              }
            >
              <Text style={[s.estrella, esFavorito(paradero.id) && { color: c.marca }]}>
                {esFavorito(paradero.id) ? "★" : "☆"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSeleccionado(null)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Text style={s.cerrar}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={s.panelLista}
            contentContainerStyle={{ paddingBottom: esp.xxl }}
            showsVerticalScrollIndicator={false}
          >
            {datos.aviso ? (
              <TarjetaAviso aviso={datos.aviso} />
            ) : (
              <Respuesta llegadas={datos.llegadas} />
            )}

            <View style={s.acciones}>
              <Pressable
                style={s.accion}
                onPress={() =>
                  router.push({
                    pathname: "/nueva-rutina",
                    params: { paraderoId: paradero.id },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={s.accionTexto}>◷  Avisarme</Text>
              </Pressable>
              <Pressable
                style={s.accion}
                onPress={() =>
                  esPremium
                    ? router.push({ pathname: "/viaje", params: { paraderoId: paradero.id } })
                    : router.push("/premium")
                }
                accessibilityRole="button"
              >
                <Text style={s.accionTexto}>▸  Me subí</Text>
              </Pressable>
              <Pressable
                style={s.accion}
                onPress={() =>
                  router.push({ pathname: "/paradero/[id]", params: { id: paradero.id } })
                }
                accessibilityRole="button"
              >
                <Text style={s.accionTexto}>Ver todo</Text>
              </Pressable>
            </View>

            <AvisoDemo compacto />

            {datos.llegadas.map((l, i) => (
              <FilaLlegada key={`${l.recorrido}-${i}`} llegada={l} />
            ))}
          </ScrollView>
        </Hoja>
      ) : null}
    </View>
  );
}

/** Alto de la barra de pestañas, sin el área segura. Debe coincidir con el
 *  del layout de pestañas: la hoja se apoya justo encima. */
const ALTO_PESTANAS = 68;
const ALTO_BUSCADOR = 48;

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },

    superior: { position: "absolute", left: esp.md, right: esp.md },
    buscador: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.md,
      backgroundColor: c.vidrio,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.vidrioBorde,
      borderRadius: radio.pastilla,
      paddingHorizontal: esp.lg,
      height: ALTO_BUSCADOR,
      ...(Platform.OS === "web" ? ({ backdropFilter: "blur(20px)" } as object) : null),
    },
    lupa: { fontSize: 19, color: c.textoSuave },
    buscadorTexto: { ...tipo.cuerpo, color: c.textoSuave },

    ubicacion: {
      position: "absolute",
      right: esp.md,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.vidrio,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.vidrioBorde,
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web" ? ({ backdropFilter: "blur(20px)" } as object) : null),
    },
    ubicacionIcono: { fontSize: 20, color: c.marca },

    agarreViejo: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borde,
      alignSelf: "center",
      marginBottom: esp.sm,
    },
    panelCabecera: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: esp.md,
      paddingHorizontal: esp.lg,
      paddingBottom: esp.md,
    },
    panelTitulos: { flex: 1, minWidth: 0 },
    panelNombre: { ...tipo.subtitulo, color: c.texto },
    panelMetaFila: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
    pulso: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.ok },
    panelMeta: { ...tipo.menor, color: c.textoTenue },
    estrella: { fontSize: 22, color: c.textoTenue, paddingHorizontal: esp.xs },
    cerrar: { fontSize: 17, color: c.textoTenue, paddingHorizontal: esp.xs },

    panelLista: { flex: 1, paddingHorizontal: esp.lg },
    acciones: { flexDirection: "row", gap: esp.sm, marginBottom: esp.md },
    accion: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: esp.sm,
      paddingHorizontal: esp.xs,
      borderRadius: radio.pastilla,
      backgroundColor: c.neutroFondo,
    },
    accionTexto: { ...tipo.menor, fontFamily: fuente.fuerte, color: c.textoSuave },
    pie: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      paddingTop: esp.lg,
      paddingHorizontal: esp.lg,
      lineHeight: 18,
    },
  });
