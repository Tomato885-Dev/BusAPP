import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tipo, useColores } from "../../src/tema";

/**
 * Alto del contenido de la barra, sin contar el área segura del teléfono.
 *
 * Se calcula a mano en vez de dejar el valor por omisión porque hay que
 * garantizar espacio para el ícono y la etiqueta: con la altura automática las
 * etiquetas no se dibujan, y con una altura fija quedan cortadas en los
 * teléfonos con indicador de inicio.
 */
const ALTO_CONTENIDO = 68;

export default function Pestanas() {
  const c = useColores();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.marca,
        tabBarInactiveTintColor: c.textoTenue,
        tabBarStyle: {
          backgroundColor: c.superficie,
          borderTopColor: c.bordeSuave,
          height: ALTO_CONTENIDO + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom + 12,
        },
        // `flexShrink: 0` es lo que impide que la etiqueta se corte.
        //
        // La barra coloca ícono y texto en una columna flexible. Sin esto el
        // texto es un hijo que se encoge, y el navegador lo comprimía a 5 px de
        // alto con `overflow: hidden`: quedaba la mitad superior de las letras.
        // Medido en el DOM, no deducido.
        tabBarLabelStyle: {
          ...tipo.micro,
          textTransform: "none",
          lineHeight: 14,
          height: 15,
          flexShrink: 0,
          marginTop: 3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>◉</Text>,
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: "Favoritos",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>★</Text>,
        }}
      />
      <Tabs.Screen
        name="llegar"
        options={{
          title: "Cómo llegar",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⇄</Text>,
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: "Más",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>≡</Text>,
        }}
      />
    </Tabs>
  );
}
