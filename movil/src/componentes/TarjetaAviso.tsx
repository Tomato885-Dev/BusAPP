import { StyleSheet, Text, View } from "react-native";

import { espacio, useColores, type Colores } from "../tema";
import type { Aviso } from "../tipos";

/**
 * Aviso de desvío o discrepancia.
 *
 * Cuando es crítico **siempre** lleva alternativa: avisar que la micro no viene
 * sin decir qué hacer en su lugar sólo le traslada el problema al usuario.
 */
export function TarjetaAviso({ aviso }: { aviso: Aviso }) {
  const c = useColores();
  const s = estilos(c);
  const critico = aviso.nivel === "critico";
  const color = critico ? c.malo : c.aviso;
  const fondo = critico ? c.maloFondo : c.avisoFondo;

  return (
    <View style={[s.caja, { backgroundColor: fondo }]}>
      <Text style={[s.titulo, { color }]}>{aviso.titulo}</Text>
      <Text style={[s.cuerpo, { color }]}>{aviso.cuerpo}</Text>
      {aviso.alternativa ? (
        <View style={[s.separador, { borderTopColor: color }]}>
          <Text style={[s.cuerpo, { color }]}>{aviso.alternativa}</Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    caja: {
      marginHorizontal: espacio.lg,
      marginTop: espacio.md,
      padding: espacio.md,
      borderRadius: 12,
    },
    titulo: { fontSize: 14.5, fontWeight: "700", marginBottom: 3 },
    cuerpo: { fontSize: 13, lineHeight: 18 },
    separador: {
      marginTop: espacio.sm,
      paddingTop: espacio.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
  });
