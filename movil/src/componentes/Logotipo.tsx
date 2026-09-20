import { Platform, StyleSheet, Text, View } from "react-native";

import { fuente, useColores } from "../tema";
import { LOGOTIPO } from "./geometriaMarca";
import { Marca } from "./Marca";

/**
 * El logotipo: el símbolo y la palabra, juntos.
 *
 * Las proporciones no son de ojo. Salen de `marca/geometria.mjs` y son las
 * mismas del muestrario impreso:
 *
 * - **El símbolo mide 0,93 del cuerpo de la letra**, o sea abarca desde el
 *   ascendente de la «k» hasta el descendente de la «y». A ese tamaño su trazo
 *   (6,7% del cuerpo) pesa lo mismo que el asta de Manrope ExtraBold (≈7%).
 *   Más chico se ve endeble al lado de la palabra; fue lo primero que saltó al
 *   mirarlos juntos por primera vez.
 * - **El aire entre ambos es 0,3 del cuerpo**, más de lo que pediría la regla,
 *   porque el punto es redondo y está suelto: con menos espacio se lee como si
 *   fuera parte de la palabra.
 * - **El interletrado es −3,5%.** Manrope viene suelta de fábrica, que está
 *   bien para leer un párrafo y mal para una palabra de cinco letras que tiene
 *   que leerse como un bloque.
 *
 * La palabra va en minúscula. «Kupay» con mayúscula lo convierte en un nombre
 * propio de empresa; «kupay» en minúscula sigue pareciendo una palabra que
 * alguien dice, que es de donde viene.
 */
export function Logotipo({
  tamano = 28,
  color,
  colorSimbolo,
  /** Sin la palabra: sólo el símbolo, a la misma altura óptica. */
  soloSimbolo,
}: {
  tamano?: number;
  color?: string;
  colorSimbolo?: string;
  soloSimbolo?: boolean;
}) {
  const c = useColores();
  const tintaPalabra = color ?? c.texto;
  const tintaSimbolo = colorSimbolo ?? color ?? c.marca;

  const simbolo = (
    <Marca tamano={tamano * LOGOTIPO.alto} color={tintaSimbolo} ajustado />
  );
  if (soloSimbolo) return simbolo;

  return (
    <View style={[s.fila, { gap: tamano * LOGOTIPO.espacio }]}>
      {simbolo}
      <Text
        style={[
          s.palabra,
          {
            color: tintaPalabra,
            fontSize: tamano,
            lineHeight: tamano,
            letterSpacing: tamano * LOGOTIPO.interletrado,
          },
        ]}
      >
        kupay
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center" },
  palabra: {
    fontFamily: fuente.extra,
    // En Android el texto trae un relleno vertical propio que descuadra
    // cualquier alineación fina; acá importa, porque el símbolo se alinea al
    // centro óptico de la palabra y no a su caja.
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
});
