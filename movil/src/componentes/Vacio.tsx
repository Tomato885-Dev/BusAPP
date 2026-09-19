import { StyleSheet, Text, View } from "react-native";

import { esp, tipo, useColores, type Colores } from "../tema";

/** Estado vacío. Los mensajes van en castellano claro, sin jerga técnica. */
export function Vacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
  const c = useColores();
  const s = estilos(c);
  return (
    <View style={s.centro}>
      <Text style={s.titulo}>{titulo}</Text>
      {detalle ? <Text style={s.detalle}>{detalle}</Text> : null}
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    centro: { alignItems: "center", justifyContent: "center", padding: esp.xl, gap: esp.sm },
    titulo: { ...tipo.cuerpoFuerte, color: c.texto, textAlign: "center" },
    detalle: { ...tipo.menor, color: c.textoSuave, textAlign: "center", lineHeight: 19 },
  });
