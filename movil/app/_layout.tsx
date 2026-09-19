import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ProveedorFavoritos } from "../src/favoritos";
import { ProveedorPremium } from "../src/premium";
import { ProveedorRutinas } from "../src/rutinas";
import { useColores } from "../src/tema";

export default function Layout() {
  const c = useColores();
  return (
    <SafeAreaProvider>
      <ProveedorPremium>
      <ProveedorRutinas>
      <ProveedorFavoritos>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.superficie },
            headerTintColor: c.marca,
            headerTitleStyle: { color: c.texto, fontWeight: "700" },
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
        </Stack>
      </ProveedorFavoritos>
      </ProveedorRutinas>
      </ProveedorPremium>
    </SafeAreaProvider>
  );
}
