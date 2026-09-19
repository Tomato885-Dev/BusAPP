import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { llegadasDeParadero } from "../../src/api";
import { FilaLlegada } from "../../src/componentes/FilaLlegada";
import { TarjetaRutina } from "../../src/componentes/TarjetaRutina";
import { useFavoritos } from "../../src/favoritos";
import { usePremium } from "../../src/premium";
import { useRutinas } from "../../src/rutinas";
import { Respuesta } from "../../src/componentes/Respuesta";
import { TarjetaAviso } from "../../src/componentes/TarjetaAviso";
import { Mapa, type Marcador } from "../../src/mapa/Mapa";
import { PARADEROS, PARADERO_POR_ID } from "../../src/red";
import { elevacion, esp, fuente, radio, tipo, useColores, type Colores } from "../../src/tema";

/** La Moneda: centro de Santiago, buen punto de partida. */
const CENTRO = { lat: -33.4429, lon: -70.6539 };

export default function PantallaMapa() {
  const c = useColores();
  const insets = useSafeAreaInsets();
  const s = estilos(c);

  const { esFavorito, alternar } = useFavoritos();
  const { rutinaActiva, minutosParaSalir } = useRutinas();
  const { esPremium } = usePremium();
  const { paraderoId } = useLocalSearchParams<{ paraderoId?: string }>();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
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
    <View style={s.pantalla}>
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
          { bottom: (paradero ? PANEL_ALTO : 0) + esp.lg },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Ir a mi ubicación"
      >
        <Text style={s.ubicacionIcono}>{buscandoUbicacion ? "…" : "⌖"}</Text>
      </Pressable>

      {paradero && datos ? (
        <View style={[s.panel, elevacion(c, 3)]}>
          <View style={s.agarre} />

          <View style={s.panelCabecera}>
            <View style={s.panelTitulos}>
              <Text style={s.panelNombre} numberOfLines={1}>
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
              <Text
                style={[s.estrella, esFavorito(paradero.id) && { color: c.marca }]}
              >
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
            contentContainerStyle={{ paddingBottom: esp.lg }}
            showsVerticalScrollIndicator={false}
          >
            {/* La respuesta primero. Todo lo demás es el detalle de por qué. */}
            {datos.aviso ? (
              <TarjetaAviso aviso={datos.aviso} />
            ) : (
              <Respuesta llegadas={datos.llegadas} />
            )}

            {/* Las acciones van como pastillas y no como botones anchos: son
                secundarias frente a la respuesta, y así no le roban el lugar. */}
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

            {datos.llegadas.map((l, i) => (
              <FilaLlegada key={`${l.recorrido}-${i}`} llegada={l} />
            ))}
            <Text style={s.pie}>
              Los rangos muestran la incertidumbre real de cada estimación.
            </Text>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const PANEL_ALTO = 380;
const ALTO_BUSCADOR = 48;

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },

    superior: { position: "absolute", left: esp.md, right: esp.md },
    buscador: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.sm,
      backgroundColor: c.superficie,
      borderRadius: radio.pastilla,
      paddingHorizontal: esp.lg,
      height: ALTO_BUSCADOR,
    },
    lupa: { fontSize: 19, color: c.textoTenue },
    buscadorTexto: { ...tipo.cuerpo, color: c.textoTenue },

    ubicacion: {
      position: "absolute",
      right: esp.md,
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: c.superficie,
      alignItems: "center",
      justifyContent: "center",
    },
    ubicacionIcono: { fontSize: 20, color: c.marca },

    panel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: PANEL_ALTO,
      backgroundColor: c.fondo,
      borderTopLeftRadius: radio.xl,
      borderTopRightRadius: radio.xl,
      paddingTop: esp.sm,
    },
    agarre: {
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
