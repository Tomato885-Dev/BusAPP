import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icono, type NombreIcono } from "../../src/componentes/Icono";
import { Logotipo } from "../../src/componentes/Logotipo";
import { usePremium } from "../../src/premium";
import { RECORRIDOS } from "../../src/red";
import { esp, radio, tipo, useColores, type Colores } from "../../src/tema";

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
        icono="lineas"
        titulo="Líneas"
        detalle={`Las ${RECORRIDOS.length} líneas de micro, Metro y tren, con su estado y su recorrido`}
        onPress={() => router.push("/lineas")}
        s={s}
      />

      <Opcion
        icono="reloj"
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

      {/* La firma es el único lugar de la app donde la marca aparece entera.
          En el mapa estorbaría: ahí lo que importa es el paradero. */}
      <View style={s.firma}>
        <Logotipo tamano={34} />
        <Text style={s.pie}>
          «küpay» es «viene» en mapudungun.{"\n"}
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
  icono: NombreIcono;
  titulo: string;
  detalle: string;
  onPress: () => void;
  destacado?: boolean;
  s: ReturnType<typeof estilos>;
}) {
  const c = useColores();
  return (
    <Pressable
      style={[s.opcion, destacado && s.opcionDestacada]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={s.opcionIcono}>
        <Icono nombre={icono} tamano={21} color={destacado ? c.marcaTexto : c.textoTenue} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.opcionTitulo, destacado && s.opcionTituloDestacado]}>{titulo}</Text>
        <Text style={[s.opcionDetalle, destacado && s.opcionDetalleDestacado]}>
          {detalle}
        </Text>
      </View>
      <Icono nombre="flecha" tamano={17} color={destacado ? c.marcaTexto : c.textoTenue} />
    </Pressable>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    // `flexGrow` + `marginTop: auto` en la firma: con dos opciones nada más, la
    // pantalla quedaba con la marca colgando a media altura y medio teléfono en
    // blanco debajo. Al pie se lee como firma y el vacío deja de ser un hueco.
    contenido: { padding: esp.lg, paddingBottom: esp.xxl, flexGrow: 1 },
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
    opcionIcono: { width: 22, alignItems: "center" },
    opcionTitulo: { ...tipo.cuerpoFuerte, color: c.texto },
    opcionTituloDestacado: { color: c.marcaTexto },
    opcionDetalle: { ...tipo.menor, color: c.textoTenue, marginTop: 2, lineHeight: 18 },
    opcionDetalleDestacado: { color: c.marcaTexto, opacity: 0.9 },

    firma: { alignItems: "center", marginTop: "auto", paddingTop: esp.xxl, gap: esp.lg },
    pie: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      lineHeight: 19,
    },
  });
