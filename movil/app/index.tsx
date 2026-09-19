import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { paraderosCercanos } from "../src/api";
import { Cargando, Problema } from "../src/componentes/Estado";
import { espacio, useColores, type Colores } from "../src/tema";
import type { Paradero } from "../src/tipos";

export default function Cercanos() {
  const c = useColores();
  const s = estilos(c);
  const [paraderos, setParaderos] = useState<Paradero[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    paraderosCercanos()
      .then((p) => vigente && setParaderos(p))
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, []);

  if (error) return <Problema mensaje={error} />;
  if (!paraderos) return <Cargando />;

  return (
    <FlatList
      data={paraderos}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={<Text style={s.encabezado}>Según tu ubicación</Text>}
      renderItem={({ item }) => (
        <Link href={{ pathname: "/paradero/[id]", params: { id: item.id } }} asChild>
          <Pressable style={({ pressed }) => [s.fila, pressed && s.presionada]}>
            <View style={s.codigo}>
              <Text style={s.codigoTexto}>{item.codigo}</Text>
            </View>
            <View style={s.medio}>
              <Text style={s.nombre} numberOfLines={1}>{item.nombre}</Text>
              <Text style={s.recorridos} numberOfLines={1}>
                {item.recorridos.join(" · ")}
              </Text>
            </View>
            <Text style={s.distancia}>{item.distanciaM} m</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    encabezado: {
      fontSize: 12,
      color: c.texto3,
      paddingHorizontal: espacio.lg,
      paddingTop: espacio.md,
      paddingBottom: espacio.sm,
    },
    fila: {
      flexDirection: "row",
      alignItems: "center",
      gap: espacio.md,
      paddingHorizontal: espacio.lg,
      paddingVertical: espacio.md + 2,
      backgroundColor: c.panel,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.linea,
    },
    presionada: { opacity: 0.6 },
    codigo: {
      minWidth: 56,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.neutroFondo,
      paddingHorizontal: espacio.sm,
    },
    codigoTexto: { fontSize: 12, fontWeight: "700", color: c.texto },
    medio: { flex: 1, minWidth: 0 },
    nombre: { fontSize: 15, fontWeight: "600", color: c.texto },
    recorridos: { fontSize: 12, color: c.texto3, marginTop: 2 },
    distancia: { fontSize: 13, fontWeight: "600", color: c.texto3 },
  });
