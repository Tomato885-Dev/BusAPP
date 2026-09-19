import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RECORRIDO_POR_ID } from "../red";
import { elevacion, esp, radio, tipo, useColores, type Colores } from "../tema";
import { paradasTexto, useViaje } from "../viaje";

/**
 * Barra del viaje en curso.
 *
 * Va fija arriba de todo, en cualquier pestaña: quien va arriba de la micro no
 * debería tener que buscar dónde quedó su viaje. Es lo único de la app que se
 * impone sobre la pantalla, y se gana ese lugar porque mientras está visible es
 * lo único que el usuario necesita.
 */
export function BarraViaje() {
  const { viaje, progreso, terminar } = useViaje();
  const c = useColores();
  const insets = useSafeAreaInsets();
  const s = estilos(c);

  // El área segura se aplica aquí y no en el layout: si lo hiciera el layout,
  // el relleno del notch empujaría toda la app hacia abajo también cuando no
  // hay viaje, que es casi siempre.
  if (!viaje || !progreso) return null;

  const recorrido = RECORRIDO_POR_ID.get(viaje.recorridoId);
  const cerca = progreso.paradasRestantes <= viaje.avisoParadas;
  const llegaste = progreso.paradasRestantes <= 0;

  return (
    <View style={[s.barra, { marginTop: insets.top + esp.sm }, cerca && s.barraCerca, elevacion(c, 2)]}>
      <View style={s.insignia}>
        <Text style={s.insigniaTexto} numberOfLines={1}>
          {recorrido?.nombre ?? "—"}
        </Text>
      </View>

      <View style={s.medio}>
        <Text style={s.cuenta} numberOfLines={1}>
          {progreso.sinUbicacion ? "Buscando tu ubicación…" : paradasTexto(progreso.paradasRestantes)}
        </Text>
        <Text style={s.destino} numberOfLines={1}>
          {llegaste ? progreso.destino : `hasta ${progreso.destino}`}
        </Text>
      </View>

      <Pressable
        onPress={terminar}
        hitSlop={12}
        style={s.terminar}
        accessibilityRole="button"
        accessibilityLabel="Terminar el viaje"
      >
        <Text style={s.terminarTexto}>Terminar</Text>
      </Pressable>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    barra: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.md,
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      paddingVertical: esp.sm,
      paddingHorizontal: esp.md,
      marginHorizontal: esp.md,
      marginBottom: esp.sm,
      borderLeftWidth: 4,
      borderLeftColor: c.marca,
    },
    barraCerca: { borderLeftColor: c.aviso, backgroundColor: c.avisoFondo },
    insignia: {
      minWidth: 46,
      paddingHorizontal: esp.sm,
      height: 30,
      borderRadius: radio.sm,
      backgroundColor: c.texto,
      alignItems: "center",
      justifyContent: "center",
    },
    insigniaTexto: { ...tipo.cuerpoFuerte, color: c.textoInverso },
    medio: { flex: 1, minWidth: 0 },
    cuenta: { ...tipo.cuerpoFuerte, color: c.texto },
    destino: { ...tipo.menor, color: c.textoSuave, marginTop: 1 },
    terminar: {
      paddingVertical: 6,
      paddingHorizontal: esp.md,
      borderRadius: radio.pastilla,
      backgroundColor: c.neutroFondo,
    },
    terminarTexto: { ...tipo.menor, fontWeight: "700", color: c.textoSuave },
  });
