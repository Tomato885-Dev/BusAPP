import { StyleSheet, Text, View } from "react-native";

import { etaTexto, origenTexto, rangoTexto, tono, type Tono } from "../formato";
import { espacio, useColores, type Colores } from "../tema";
import type { Llegada } from "../tipos";

export function FilaLlegada({ llegada }: { llegada: Llegada }) {
  const c = useColores();
  const s = estilos(c);
  const t = tono(llegada.estado, llegada.confianza);

  return (
    <View style={s.fila}>
      <View style={s.insignia}>
        <Text style={s.insigniaTexto}>{llegada.recorrido}</Text>
      </View>

      <View style={s.medio}>
        <Text style={s.destino} numberOfLines={1}>{llegada.destino}</Text>
        {llegada.via ? <Text style={s.via} numberOfLines={1}>{llegada.via}</Text> : null}
        <View style={[s.pastilla, { backgroundColor: fondoDe(c, t) }]}>
          <Text style={[s.pastillaTexto, { color: colorDe(c, t) }]}>
            {origenTexto(llegada)}
          </Text>
        </View>
      </View>

      <View style={s.derecha}>
        <Text style={[s.eta, { color: colorDe(c, t) }]}>{etaTexto(llegada)}</Text>
        <Text style={s.rango}>{rangoTexto(llegada)}</Text>
      </View>
    </View>
  );
}

function colorDe(c: Colores, t: Tono): string {
  return { ok: c.ok, aviso: c.aviso, malo: c.malo, neutro: c.neutro }[t];
}

function fondoDe(c: Colores, t: Tono): string {
  return { ok: c.okFondo, aviso: c.avisoFondo, malo: c.maloFondo, neutro: c.neutroFondo }[t];
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    fila: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: espacio.md,
      paddingHorizontal: espacio.lg,
      paddingVertical: espacio.md + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.linea,
    },
    insignia: {
      minWidth: 50,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.neutroFondo,
      paddingHorizontal: espacio.sm,
    },
    insigniaTexto: { fontWeight: "700", fontSize: 15, color: c.texto },
    medio: { flex: 1, minWidth: 0 },
    destino: { fontSize: 15, fontWeight: "600", color: c.texto },
    via: { fontSize: 12, color: c.texto3, marginTop: 2 },
    pastilla: {
      alignSelf: "flex-start",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: espacio.sm - 2,
    },
    pastillaTexto: { fontSize: 11, fontWeight: "600" },
    derecha: { alignItems: "flex-end" },
    eta: { fontSize: 22, fontWeight: "700", lineHeight: 26 },
    rango: { fontSize: 11.5, fontWeight: "600", color: c.texto3, marginTop: 1 },
  });
