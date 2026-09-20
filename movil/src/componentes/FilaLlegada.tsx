import { StyleSheet, Text, View } from "react-native";

import { etaTexto, origenTexto, rangoTexto, tono, type Tono } from "../formato";
import { esp, radio, tipo, useColores, type Colores } from "../tema";
import type { Llegada } from "../tipos";
import { BarraIncertidumbre } from "./BarraIncertidumbre";
import { Insignia } from "./Insignia";

export function FilaLlegada({ llegada }: { llegada: Llegada }) {
  const c = useColores();
  const s = estilos(c);
  const t = tono(llegada.estado, llegada.confianza);
  const color = colorDe(c, t);
  const apagada = llegada.estado === "no_llegara" || llegada.etaSegundos === null;

  return (
    <View style={[s.fila, apagada && s.filaApagada]}>
      {/* Una franja del color del recorrido al canto: identifica la línea
          incluso antes de leer el número. */}
      <View style={[s.canto, { backgroundColor: apagada ? c.neutro : color }]} />

      <View style={s.contenido}>
        <View style={s.arriba}>
          <Insignia nombre={llegada.recorrido} apagada={apagada} />

          <View style={s.medio}>
            <Text style={[s.destino, apagada && s.tachado]} numberOfLines={1}>
              {llegada.destino || "—"}
            </Text>
            <Text style={[s.origen, { color: apagada ? c.textoTenue : color }]} numberOfLines={1}>
              {origenTexto(llegada)}
            </Text>
          </View>

          <View style={s.derecha}>
            <Text style={[s.eta, { color: apagada ? c.textoTenue : color }]} numberOfLines={1}>
              {etaTexto(llegada)}
            </Text>
            {!apagada ? <Text style={s.unidad}>min</Text> : null}
          </View>
        </View>

        {/* La incertidumbre dibujada. Es lo que Kupay promete y ninguna otra
            app muestra: hasta dónde llega lo que sabe. */}
        {llegada.rangoSegundos && llegada.etaSegundos !== null ? (
          <>
            <BarraIncertidumbre
              minS={llegada.rangoSegundos[0]}
              maxS={llegada.rangoSegundos[1]}
              etaS={llegada.etaSegundos}
              color={color}
            />
            <Text style={s.rango}>{rangoTexto(llegada)}</Text>
          </>
        ) : null}
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
      borderRadius: radio.md,
      backgroundColor: c.superficie,
      marginBottom: esp.sm,
      overflow: "hidden",
    },
    filaApagada: { backgroundColor: c.maloFondo },
    canto: { width: 4 },
    contenido: { flex: 1, minWidth: 0, paddingVertical: esp.md, paddingHorizontal: esp.lg },

    arriba: { flexDirection: "row", alignItems: "center", gap: esp.md },
    medio: { flex: 1, minWidth: 0 },
    destino: { ...tipo.cuerpoFuerte, color: c.texto },
    tachado: { textDecorationLine: "line-through", color: c.textoSuave },
    origen: { ...tipo.menor, marginTop: 2 },

    derecha: { alignItems: "flex-end", minWidth: 54 },
    eta: { ...tipo.dato },
    unidad: { ...tipo.micro, color: c.textoTenue, marginTop: -1 },

    rango: { ...tipo.menor, color: c.textoTenue, marginTop: 4 },
  });
