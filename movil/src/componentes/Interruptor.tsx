import { Pressable, StyleSheet, Text, View } from "react-native";

import { esp, radio, tipo, useColores, type Colores } from "../tema";

/**
 * Interruptor propio, en vez del `Switch` del sistema.
 *
 * El nativo no toma el color de marca de forma consistente entre iPhone,
 * Android y web, y en este producto el color comunica estado.
 */
export function Interruptor({
  activo,
  onCambiar,
  etiqueta,
}: {
  activo: boolean;
  onCambiar: (valor: boolean) => void;
  etiqueta: string;
}) {
  const c = useColores();
  const s = estilos(c);
  return (
    <Pressable
      onPress={() => onCambiar(!activo)}
      style={s.fila}
      accessibilityRole="switch"
      accessibilityState={{ checked: activo }}
      accessibilityLabel={etiqueta}
    >
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <View style={[s.pista, activo && { backgroundColor: c.marca }]}>
        <View style={[s.perilla, activo && { alignSelf: "flex-end" }]} />
      </View>
    </Pressable>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    fila: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: esp.md,
      paddingVertical: esp.md,
    },
    etiqueta: { ...tipo.cuerpo, color: c.texto, flex: 1 },
    pista: {
      width: 48,
      height: 28,
      borderRadius: radio.pastilla,
      backgroundColor: c.borde,
      padding: 3,
      justifyContent: "center",
    },
    perilla: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#fff",
    },
  });
