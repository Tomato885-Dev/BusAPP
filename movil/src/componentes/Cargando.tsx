import { StyleSheet, Text, View } from "react-native";

import { esp, tipo, useColores, type Colores } from "../tema";
import { Marca } from "./Marca";

/**
 * Pantalla de carga.
 *
 * Aparece mientras se prepara la tipografía, que es el único momento en que la
 * app no puede dibujarse bien. Dura poco, así que no lleva texto que nadie
 * alcanzaría a leer: sólo el símbolo avanzando, que es lo que la app hace.
 */
export function Cargando({ mensaje }: { mensaje?: string }) {
  const c = useColores();
  const s = estilos(c);
  return (
    <View style={s.pantalla}>
      <Marca tamano={96} animado />
      {mensaje ? <Text style={s.mensaje}>{mensaje}</Text> : null}
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: c.fondo,
      alignItems: "center",
      justifyContent: "center",
      gap: esp.lg,
    },
    // Sin la tipografía cargada este texto sale con la del sistema; por eso no
    // se usa en el arranque, sólo en las cargas de dentro de la app.
    mensaje: { ...tipo.menor, color: c.textoTenue },
  });
