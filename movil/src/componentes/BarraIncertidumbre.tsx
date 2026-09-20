import { StyleSheet, View } from "react-native";

import { useColores } from "../tema";

/** Media hora. Más allá de eso la espera ya no se mide, se sufre. */
const ESCALA_S = 30 * 60;

/**
 * La incertidumbre, dibujada.
 *
 * Kupay promete un rango, no un número: «entre 3 y 9 minutos». En texto eso se
 * lee y se olvida. Como barra se entiende de un vistazo cuánto sabe la app y
 * cuánto no, que es justo lo que la distingue de una que inventa un minuto
 * exacto.
 *
 * La escala es **la misma en todas las filas** —media hora—, así que las barras
 * se pueden comparar entre sí: una franja corta y a la izquierda es una micro
 * que viene pronto y con poca duda; una que ocupa todo el ancho es la app
 * diciendo que no sabe.
 */
export function BarraIncertidumbre({
  minS,
  maxS,
  etaS,
  color,
}: {
  minS: number;
  maxS: number;
  etaS: number;
  color: string;
}) {
  const c = useColores();
  const s = estilos();

  const tope = Math.max(ESCALA_S, maxS);
  const pct = (v: number) =>
    `${Math.max(0, Math.min(100, (v / tope) * 100))}%` as `${number}%`;

  return (
    <View style={[s.riel, { backgroundColor: c.bordeSuave }]}>
      <View
        style={[
          s.rango,
          {
            backgroundColor: color,
            opacity: 0.45,
            left: pct(minS),
            right: pct(tope - Math.min(tope, maxS)),
          },
        ]}
      />
      <View style={[s.marca, { backgroundColor: color, left: pct(etaS) }]} />
    </View>
  );
}

const estilos = () =>
  StyleSheet.create({
    riel: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 7 },
    rango: { position: "absolute", top: 0, bottom: 0, borderRadius: 3 },
    marca: { position: "absolute", top: 0, bottom: 0, width: 3, borderRadius: 2, marginLeft: -1 },
  });
