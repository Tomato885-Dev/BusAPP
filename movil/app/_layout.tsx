import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useColores } from "../src/tema";

export default function Layout() {
  const c = useColores();
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.panel },
          headerTintColor: c.acento,
          headerTitleStyle: { color: c.texto },
          contentStyle: { backgroundColor: c.fondo },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Paraderos cercanos" }} />
        <Stack.Screen name="paradero/[id]" options={{ title: "Llegadas" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
