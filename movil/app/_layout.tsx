import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ProveedorFavoritos } from "../src/favoritos";
import { useColores } from "../src/tema";

export default function Layout() {
  const c = useColores();
  return (
    <SafeAreaProvider>
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
        </Stack>
      </ProveedorFavoritos>
    </SafeAreaProvider>
  );
}
