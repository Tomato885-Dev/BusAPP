import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { coloresDe } from "../red";
import { fuente, radio, tipo } from "../tema";

/**
 * La insignia de un recorrido, con su color oficial.
 *
 * El feed del DTPM trae el color de cada recorrido: los del Metro —L1 roja, L5
 * verde— y los de cada zona de micros, que son los mismos con que están
 * pintadas. Usarlos no es decoración: es lo que permite reconocer la línea de
 * un vistazo, igual que en la calle.
 */
export function Insignia({
  nombre,
  tamano = "normal",
  estilo,
  apagada,
}: {
  nombre: string;
  tamano?: "chica" | "normal" | "grande";
  estilo?: ViewStyle;
  /** Para recorridos detenidos: el color se atenúa, no se reemplaza. */
  apagada?: boolean;
}) {
  const { fondo, texto } = coloresDe(nombre);
  const m = MEDIDAS[tamano];

  return (
    <View
      style={[
        s.caja,
        // Atenuar y no reemplazar: una L1 gris deja de ser la L1, y el color
        // es justamente lo que permite reconocerla sin leer.
        { backgroundColor: fondo, opacity: apagada ? 0.42 : 1, height: m.alto, minWidth: m.ancho },
        estilo,
      ]}
    >
      <Text style={[s.texto, { color: texto, fontSize: m.fuente }]} numberOfLines={1}>
        {nombre}
      </Text>
    </View>
  );
}

const MEDIDAS = {
  chica: { alto: 24, ancho: 40, fuente: 12 },
  normal: { alto: 34, ancho: 54, fuente: 15 },
  grande: { alto: 40, ancho: 60, fuente: 18 },
} as const;

const s = StyleSheet.create({
  caja: {
    paddingHorizontal: 7,
    borderRadius: radio.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { fontFamily: fuente.extra, letterSpacing: -0.3 },
});
