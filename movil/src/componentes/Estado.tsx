import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { espacio, useColores, type Colores } from "../tema";

export function Cargando() {
  const c = useColores();
  return (
    <View style={estilos(c).centro}>
      <ActivityIndicator color={c.acento} />
    </View>
  );
}

/** Los errores se explican en castellano, sin jerga técnica. */
export function Problema({ mensaje }: { mensaje: string }) {
  const c = useColores();
  const s = estilos(c);
  return (
    <View style={s.centro}>
      <Text style={s.titulo}>No pudimos cargar esto</Text>
      <Text style={s.detalle}>{mensaje}</Text>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    centro: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: espacio.xl,
      gap: espacio.sm,
    },
    titulo: { fontSize: 16, fontWeight: "600", color: c.texto },
    detalle: { fontSize: 13.5, color: c.texto2, textAlign: "center" },
  });
