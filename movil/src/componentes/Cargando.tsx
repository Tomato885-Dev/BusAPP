import { StyleSheet, Text, View } from "react-native";

import { esp, tipo, useColores, type Colores } from "../tema";
import { Marca } from "./Marca";

/**
 * Cuánto mide el símbolo del arranque.
 *
 * No es un número elegido: tiene que coincidir con el de la pantalla nativa
 * que el sistema muestra **antes** de que exista React. Ahí el ícono se dibuja
 * a 180 px de ancho (`app.json`), y dentro de ese PNG el trazo ocupa el 76%;
 * de ahí sale un alto de 78. Si no coincidieran, al arrancar la app el símbolo
 * daría un salto de tamaño justo al aparecer.
 */
const ALTO_SIMBOLO = 78;

/**
 * Pantalla de arranque.
 *
 * Aparece mientras se prepara la tipografía, que es el único momento en que la
 * app no puede dibujarse bien.
 *
 * **Es una copia exacta de la pantalla nativa de inicio**: mismo fondo, mismo
 * símbolo, mismo tamaño. Ésa es toda la idea. Antes ésta tenía el fondo claro
 * de la app, así que el arranque era un parpadeo —teal, gris, app— y ese
 * parpadeo es la primera impresión del producto. Ahora la única diferencia
 * entre una y otra es que ésta se mueve, de modo que la transición no se ve:
 * el símbolo simplemente empieza a avanzar.
 *
 * No lleva texto, y no por gusto: la tipografía todavía no está cargada, así
 * que cualquier palabra saldría con la del sistema y después saltaría.
 */
export function Cargando({ mensaje }: { mensaje?: string }) {
  const c = useColores();
  const s = estilos(c);
  return (
    <View style={s.pantalla}>
      <Marca tamano={ALTO_SIMBOLO} color="#ffffff" ajustado animado />
      {mensaje ? <Text style={s.mensaje}>{mensaje}</Text> : null}
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: c.marcaHonda,
      alignItems: "center",
      justifyContent: "center",
      gap: esp.xl,
    },
    // Sólo se usa en las cargas de **dentro** de la app, cuando la tipografía
    // ya está; en el arranque no se pasa mensaje.
    mensaje: { ...tipo.menor, color: "rgba(255,255,255,0.72)" },
  });
