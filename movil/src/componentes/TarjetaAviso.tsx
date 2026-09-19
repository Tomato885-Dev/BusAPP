import { StyleSheet, Text, View } from "react-native";

import { type Colores, esp, fuente, radio, tipo, useColores } from "../tema";
import type { Aviso } from "../tipos";

/**
 * Aviso de desvío o de discrepancia entre fuentes.
 *
 * Va arriba de todo y es lo primero que se lee. Cuando la micro no viene, esta
 * tarjeta es el producto entero: es lo que ninguna otra app dice.
 */
export function TarjetaAviso({ aviso }: { aviso: Aviso }) {
  const c = useColores();
  const s = estilos(c);
  const critico = aviso.nivel === "critico";
  const color = critico ? c.malo : c.aviso;
  const fondo = critico ? c.maloFondo : c.avisoFondo;

  return (
    <View style={[s.caja, { backgroundColor: fondo, borderLeftColor: color }]}>
      <View style={s.encabezado}>
        <Text style={[s.icono, { color }]}>{critico ? "✕" : "!"}</Text>
        <Text style={[s.titulo, { color }]}>{aviso.titulo}</Text>
      </View>
      <Text style={[s.cuerpo, { color }]}>{aviso.cuerpo}</Text>
      {aviso.alternativa ? (
        <View style={[s.alternativa, { borderTopColor: color }]}>
          <Text style={[s.cuerpo, { color }]}>{aviso.alternativa}</Text>
        </View>
      ) : null}
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    caja: {
      padding: esp.lg,
      borderRadius: radio.md,
      borderLeftWidth: 4,
      marginBottom: esp.md,
    },
    encabezado: { flexDirection: "row", alignItems: "flex-start", gap: esp.sm },
    icono: { fontFamily: fuente.extra, fontSize: 15, lineHeight: 21 },
    titulo: { ...tipo.cuerpoFuerte, flex: 1, lineHeight: 21 },
    cuerpo: { ...tipo.menor, lineHeight: 19, marginTop: 4, opacity: 0.92 },
    alternativa: {
      marginTop: esp.md,
      paddingTop: esp.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
  });
