import { StyleSheet, Text, View } from "react-native";

import { aMinutos } from "../formato";
import { esp, fuente, radio, tipo, useColores, type Colores } from "../tema";
import type { Llegada } from "../tipos";

/**
 * La respuesta, arriba de todo.
 *
 * Kupay existe para contestar una pregunta —«¿viene o no viene?»— y hasta ahora
 * la contestaba haciendo que el usuario leyera una lista y dedujera. Esto la
 * contesta en una línea, antes de cualquier detalle: la micro, el número grande
 * y el estado. Es lo único que mucha gente va a mirar.
 */
export function Respuesta({ llegadas }: { llegadas: Llegada[] }) {
  const c = useColores();
  const s = estilos(c);

  const proxima = llegadas.find(
    (l) => l.estado !== "no_llegara" && l.etaSegundos !== null,
  );

  if (!proxima) {
    return (
      <View style={[s.caja, { backgroundColor: c.maloFondo }]}>
        <Text style={[s.titular, { color: c.malo }]}>No viene ninguna</Text>
        <Text style={[s.pie, { color: c.malo }]}>
          Ni por hora ni por recorrido. Revisa las alternativas más abajo.
        </Text>
      </View>
    );
  }

  const minutos = aMinutos(proxima.etaSegundos!);
  const enVivo = proxima.fuente === "telemetria";
  const color = enVivo ? c.ok : c.marca;
  const fondo = enVivo ? c.okFondo : c.marcaSuave;

  return (
    <View style={[s.caja, { backgroundColor: fondo }]}>
      <View style={s.fila}>
        <View style={[s.insignia, { backgroundColor: color }]}>
          <Text style={s.insigniaTexto} numberOfLines={1}>
            {proxima.recorrido}
          </Text>
        </View>

        <View style={s.medio}>
          <Text style={[s.titular, { color }]} numberOfLines={1}>
            {minutos <= 0 ? "Está llegando" : minutos === 1 ? "Llega en 1 minuto" : `Llega en ${minutos} minutos`}
          </Text>
          <Text style={[s.pie, { color }]} numberOfLines={1}>
            {enVivo
              ? `confirmado por ${proxima.personasABordo ?? 1} ${
                  (proxima.personasABordo ?? 1) === 1 ? "persona" : "personas"
                } a bordo`
              : "según el horario oficial, sin confirmar"}
          </Text>
        </View>

        {/* Los tres ángulos de la marca, que es «viene». Los dos primeros más
            tenues, como en el ícono: la información se acerca. */}
        <View style={s.marca}>
          <Text style={[s.angulo, { color, opacity: 0.3 }]}>›</Text>
          <Text style={[s.angulo, { color, opacity: 0.6 }]}>›</Text>
          <Text style={[s.angulo, { color }]}>›</Text>
        </View>
      </View>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    caja: { borderRadius: radio.md, padding: esp.lg, marginBottom: esp.md },
    fila: { flexDirection: "row", alignItems: "center", gap: esp.md },
    insignia: {
      minWidth: 52,
      paddingHorizontal: esp.sm,
      height: 38,
      borderRadius: radio.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    insigniaTexto: { ...tipo.subtitulo, color: c.textoInverso },
    medio: { flex: 1, minWidth: 0 },
    titular: { ...tipo.subtitulo },
    pie: { ...tipo.menor, marginTop: 1, opacity: 0.85 },
    marca: { flexDirection: "row", alignItems: "center" },
    angulo: { fontFamily: fuente.extra, fontSize: 22, marginLeft: -5 },
  });
