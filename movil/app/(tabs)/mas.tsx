import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Marca } from "../../src/componentes/Marca";
import { usePremium } from "../../src/premium";
import { RECORRIDOS } from "../../src/red";
import { esp, fuente, radio, tipo, useColores, type Colores } from "../../src/tema";

/**
 * Lo secundario.
 *
 * Kupay sirve para una cosa: saber si viene la micro. Todo lo demás —las
 * líneas, la suscripción, los ajustes— es útil pero no es el motivo por el que
 * alguien abre la app parado en un paradero, y por eso vive acá adentro en vez
 * de ocupar una pestaña.
 */
export default function PantallaMas() {
  const c = useColores();
  const s = estilos(c);
  const insets = useSafeAreaInsets();
  const { esPremium } = usePremium();

  return (
    <ScrollView
      style={s.pantalla}
      contentContainerStyle={[s.contenido, { paddingTop: insets.top + esp.lg }]}
    >
      <Text style={s.titulo}>Más</Text>

      <Opcion
        icono="≡"
        titulo="Líneas"
        detalle={`Las ${RECORRIDOS.length} líneas de micro, Metro y tren, con su estado y su recorrido`}
        onPress={() => router.push("/lineas")}
        s={s}
      />

      <Opcion
        icono="◷"
        titulo={esPremium ? "Kupay Premium" : "Hazte Premium"}
        detalle={
          esPremium
            ? "Tus rutinas, tus avisos y tus números"
            : "Que la información te busque a ti"
        }
        onPress={() => router.push("/premium")}
        destacado={!esPremium}
        s={s}
      />

      <View style={s.firma}>
        <Marca tamano={56} animado />
        <Text style={s.pie}>
          <Text style={s.pieFuerte}>Kupay</Text> · «küpay» es «viene» en mapudungun.{"\n"}
          Datos de la red: DTPM, Directorio de Transporte Público Metropolitano.
        </Text>
      </View>
    </ScrollView>
  );
}

function Opcion({
  icono,
  titulo,
  detalle,
  onPress,
  destacado,
  s,
}: {
  icono: string;
  titulo: string;
  detalle: string;
  onPress: () => void;
  destacado?: boolean;
  s: ReturnType<typeof estilos>;
}) {
  return (
    <Pressable
      style={[s.opcion, destacado && s.opcionDestacada]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[s.opcionIcono, destacado && s.opcionIconoDestacado]}>{icono}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.opcionTitulo, destacado && s.opcionTituloDestacado]}>{titulo}</Text>
        <Text style={[s.opcionDetalle, destacado && s.opcionDetalleDestacado]}>
          {detalle}
        </Text>
      </View>
      <Text style={[s.flecha, destacado && s.opcionIconoDestacado]}>›</Text>
    </Pressable>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: esp.lg, paddingBottom: esp.xxl },
    titulo: { ...tipo.titulo, color: c.texto, marginBottom: esp.lg },

    opcion: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.md,
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
      marginBottom: esp.sm,
    },
    opcionDestacada: { backgroundColor: c.marcaSuave },
    opcionIcono: { fontSize: 18, color: c.textoTenue, width: 22, textAlign: "center" },
    opcionIconoDestacado: { color: c.marcaTexto },
    opcionTitulo: { ...tipo.cuerpoFuerte, color: c.texto },
    opcionTituloDestacado: { color: c.marcaTexto },
    opcionDetalle: { ...tipo.menor, color: c.textoTenue, marginTop: 2, lineHeight: 18 },
    opcionDetalleDestacado: { color: c.marcaTexto, opacity: 0.9 },
    flecha: { fontSize: 22, color: c.textoTenue },

    firma: { alignItems: "center", marginTop: esp.xxl, gap: esp.md },
    pie: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      lineHeight: 19,
    },
    pieFuerte: { fontFamily: fuente.fuerte, color: c.textoSuave },
  });
