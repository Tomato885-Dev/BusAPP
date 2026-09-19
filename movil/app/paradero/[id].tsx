import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { llegadasDeParadero } from "../../src/api";
import { Cargando, Problema } from "../../src/componentes/Estado";
import { FilaLlegada } from "../../src/componentes/FilaLlegada";
import { TarjetaAviso } from "../../src/componentes/TarjetaAviso";
import { espacio, useColores, type Colores } from "../../src/tema";
import type { RespuestaParadero } from "../../src/tipos";

/** Cada cuánto se refresca sola la pantalla. */
const REFRESCO_MS = 20_000;

export default function Llegadas() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColores();
  const s = estilos(c);

  const [datos, setDatos] = useState<RespuestaParadero | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setDatos(await llegadasDeParadero(id));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void cargar();
    const t = setInterval(() => void cargar(), REFRESCO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const alRefrescar = useCallback(async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }, [cargar]);

  if (error && !datos) return <Problema mensaje={error} />;
  if (!datos) return <Cargando />;

  return (
    <>
      <Stack.Screen options={{ title: datos.codigo }} />
      <FlatList
        data={datos.llegadas}
        keyExtractor={(l, i) => `${l.recorrido}-${i}`}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} tintColor={c.acento} />
        }
        ListHeaderComponent={
          <View>
            <View style={s.cabecera}>
              <Text style={s.nombre}>{datos.nombre}</Text>
              <Text style={s.meta}>
                Actualizado hace {datos.actualizadoHace} s
              </Text>
            </View>
            {datos.aviso ? <TarjetaAviso aviso={datos.aviso} /> : null}
          </View>
        }
        renderItem={({ item }) => <FilaLlegada llegada={item} />}
        ListFooterComponent={
          <Text style={s.pie}>
            Los rangos reflejan la incertidumbre real de cada estimación.
          </Text>
        }
      />
    </>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    cabecera: { paddingHorizontal: espacio.lg, paddingTop: espacio.md, paddingBottom: espacio.sm },
    nombre: { fontSize: 19, fontWeight: "700", color: c.texto },
    meta: { fontSize: 12.5, color: c.texto3, marginTop: 2 },
    pie: {
      fontSize: 12,
      color: c.texto3,
      textAlign: "center",
      paddingHorizontal: espacio.xl,
      paddingVertical: espacio.xl,
      lineHeight: 17,
    },
  });
