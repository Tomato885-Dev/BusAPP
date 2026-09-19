import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/manrope";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BarraViaje } from "../src/componentes/BarraViaje";

import { ProveedorFavoritos } from "../src/favoritos";
import { ProveedorPremium } from "../src/premium";
import { ProveedorRutinas } from "../src/rutinas";
import { fuente, useColores } from "../src/tema";
import { ProveedorViaje } from "../src/viaje";

export default function Layout() {
  const c = useColores();
  const [tipografiaLista, errorTipografia] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Se espera a la tipografía para no mostrar medio segundo de la fuente del
  // sistema y después un salto. Pero si la carga **falla** se dibuja igual: una
  // app que no arranca por una fuente es peor que una app con otra fuente.
  if (!tipografiaLista && !errorTipografia) {
    return <View style={{ flex: 1, backgroundColor: c.fondo }} />;
  }

  return (
    <SafeAreaProvider>
      <ProveedorPremium>
      <ProveedorRutinas>
      <ProveedorFavoritos>
      <ProveedorViaje>
        <StatusBar style="auto" />
        {/* La barra del viaje va sobre el navegador, no dentro de una pantalla:
            quien va arriba de la micro la necesita en todas, y las pestañas no
            cubren al paradero ni a los modales. Sin viaje no dibuja nada. */}
        <View style={{ flex: 1, backgroundColor: c.fondo }}>
        <BarraViaje />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.superficie },
            headerTintColor: c.marca,
            headerTitleStyle: { color: c.texto, fontFamily: fuente.fuerte },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.fondo },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="paradero/[id]" options={{ title: "Paradero" }} />
          <Stack.Screen
            name="nueva-rutina"
            options={{ title: "Nueva rutina", presentation: "modal" }}
          />
          <Stack.Screen
            name="viaje"
            options={{ title: "Voy en camino", presentation: "modal" }}
          />
          <Stack.Screen name="lineas" options={{ title: "Líneas" }} />
          <Stack.Screen name="linea/[id]" options={{ title: "Línea" }} />
          <Stack.Screen name="premium" options={{ title: "Kupay Premium" }} />
        </Stack>
        </View>
      </ProveedorViaje>
      </ProveedorFavoritos>
      </ProveedorRutinas>
      </ProveedorPremium>
    </SafeAreaProvider>
  );
}
