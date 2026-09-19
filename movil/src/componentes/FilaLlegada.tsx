import { StyleSheet, Text, View } from "react-native";

import { etaTexto, origenTexto, rangoTexto, tono, type Tono } from "../formato";
import { type Colores, esp, fuente, radio, tipo, useColores } from "../tema";
import type { Llegada } from "../tipos";

export function FilaLlegada({ llegada }: { llegada: Llegada }) {
  const c = useColores();
  const s = estilos(c);
  const t = tono(llegada.estado, llegada.confianza);
  const color = colorDe(c, t);
  const apagada = llegada.estado === "no_llegara";

  return (
    <View style={[s.fila, apagada && s.filaApagada]}>
      <View style={[s.insignia, apagada && { opacity: 0.55 }]}>
        <Text style={s.insigniaTexto} numberOfLines={1}>
          {llegada.recorrido}
        </Text>
      </View>

      <View style={s.medio}>
        <Text style={[s.destino, apagada && s.tachado]} numberOfLines={1}>
          {llegada.destino || "—"}
        </Text>
        <View style={s.origenFila}>
          <View style={[s.puntoEstado, { backgroundColor: color }]} />
          <Text style={[s.origen, { color }]} numberOfLines={1}>
            {origenTexto(llegada)}
          </Text>
        </View>
      </View>

      <View style={s.derecha}>
        <Text style={[s.eta, { color }]} numberOfLines={1}>
          {etaTexto(llegada)}
        </Text>
        <Text style={s.rango} numberOfLines={1}>
          {rangoTexto(llegada)}
        </Text>
      </View>
    </View>
  );
}

function colorDe(c: Colores, t: Tono): string {
  return { ok: c.ok, aviso: c.aviso, malo: c.malo, neutro: c.neutro }[t];
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    fila: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.md,
      paddingVertical: esp.md,
      paddingHorizontal: esp.lg,
      borderRadius: radio.md,
      backgroundColor: c.superficie,
      marginBottom: esp.sm,
    },
    filaApagada: { backgroundColor: c.maloFondo },
    insignia: {
      minWidth: 54,
      paddingHorizontal: esp.sm,
      height: 34,
      borderRadius: radio.sm,
      backgroundColor: c.texto,
      alignItems: "center",
      justifyContent: "center",
    },
    insigniaTexto: { ...tipo.cuerpoFuerte, color: c.textoInverso },
    medio: { flex: 1, minWidth: 0 },
    destino: { ...tipo.cuerpoFuerte, color: c.texto },
    tachado: { textDecorationLine: "line-through", color: c.textoSuave },
    origenFila: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
    puntoEstado: { width: 6, height: 6, borderRadius: 3 },
    origen: { ...tipo.menor, flexShrink: 1 },
    derecha: { alignItems: "flex-end", minWidth: 64 },
    eta: { fontFamily: fuente.extra, fontSize: 27, letterSpacing: -1, lineHeight: 31 },
    rango: { ...tipo.menor, color: c.textoTenue, marginTop: 1 },
  });
