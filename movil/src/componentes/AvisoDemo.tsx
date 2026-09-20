import { StyleSheet, Text, View } from "react-native";

import { MODO_DEMO } from "../api";
import { esp, fuente, radio, tipo, useColores, type Colores } from "../tema";

/**
 * Lo que es real y lo que no, dicho donde están los números.
 *
 * Kupay se vende por no inventar tiempos. Mostrar una estimación simulada sin
 * decirlo sería el mismo defecto que viene a corregir, y además el peor momento
 * para descubrirlo es parado en un paradero.
 *
 * Cuando exista la posición en vivo, esto desaparece solo.
 */
export function AvisoDemo({ compacto }: { compacto?: boolean }) {
  const c = useColores();
  const s = estilos(c);

  if (!MODO_DEMO) return null;

  if (compacto) {
    return (
      <View style={s.tira}>
        <Text style={s.tiraTexto}>
          Demostración · las frecuencias sí son oficiales
        </Text>
      </View>
    );
  }

  return (
    <View style={s.caja}>
      <Text style={s.titulo}>Estos tiempos son una demostración</Text>
      <Text style={s.cuerpo}>
        Lo que es real: <Text style={s.fuerte}>cada cuántos minutos</Text> pasa cada
        recorrido y a qué horas opera, según el DTPM.{"\n"}
        Lo que todavía no: <Text style={s.fuerte}>cuándo viene el próximo</Text>. Para eso
        falta la posición en vivo de los buses.
      </Text>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    tira: {
      backgroundColor: c.avisoFondo,
      borderRadius: radio.sm,
      paddingVertical: 5,
      paddingHorizontal: esp.md,
      marginBottom: esp.sm,
    },
    tiraTexto: { ...tipo.menor, color: c.aviso, textAlign: "center" },

    caja: {
      backgroundColor: c.avisoFondo,
      borderRadius: radio.md,
      padding: esp.lg,
      marginBottom: esp.md,
    },
    titulo: { ...tipo.cuerpoFuerte, color: c.aviso },
    cuerpo: { ...tipo.menor, color: c.aviso, marginTop: 4, lineHeight: 19 },
    fuerte: { fontFamily: fuente.fuerte },
  });
