import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { llegadasDeParadero } from "../../src/api";
import { FilaLlegada } from "../../src/componentes/FilaLlegada";
import { TarjetaAviso } from "../../src/componentes/TarjetaAviso";
import { Mapa, type Marcador } from "../../src/mapa/Mapa";
import { PARADEROS, PARADERO_POR_ID } from "../../src/red";
import { elevacion, esp, radio, tipo, useColores, type Colores } from "../../src/tema";

/** La Moneda: centro de Santiago, buen punto de partida. */
const CENTRO = { lat: -33.4429, lon: -70.6539 };

export default function PantallaMapa() {
  const c = useColores();
  const insets = useSafeAreaInsets();
  const s = estilos(c);

  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [irA, setIrA] = useState<{ lat: number; lon: number; zoom?: number; nonce: number } | null>(null);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  const marcadores: Marcador[] = useMemo(
    () => PARADEROS.map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, etiqueta: p.codigo })),
    [],
  );

  const paradero = seleccionado ? PARADERO_POR_ID.get(seleccionado) : null;
  const datos = useMemo(
    () => (seleccionado ? llegadasDeParadero(seleccionado) : null),
    [seleccionado],
  );

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
              <Text style={s.panelMeta}>
                {paradero.codigo} · actualizado hace {datos.actualizadoHace} s
              </Text>
            </View>
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
            {datos.aviso ? <TarjetaAviso aviso={datos.aviso} /> : null}
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
    panelMeta: { ...tipo.menor, color: c.textoTenue, marginTop: 2 },
    cerrar: { fontSize: 17, color: c.textoTenue, paddingHorizontal: esp.xs },

    panelLista: { flex: 1, paddingHorizontal: esp.lg },
    pie: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      paddingTop: esp.lg,
      paddingHorizontal: esp.lg,
      lineHeight: 18,
    },
  });
