import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { llegadasDeParadero } from "../../src/api";
import { FilaLlegada } from "../../src/componentes/FilaLlegada";
import { TarjetaAviso } from "../../src/componentes/TarjetaAviso";
import { Vacio } from "../../src/componentes/Vacio";
import { PARADERO_POR_ID } from "../../src/red";
import { esp, tipo, useColores, type Colores } from "../../src/tema";

/** Cada cuánto se refresca sola la pantalla. */
const REFRESCO_MS = 20_000;

export default function PantallaParadero() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColores();
  const s = estilos(c);

  const paradero = PARADERO_POR_ID.get(id);
  const [tic, setTic] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTic((n) => n + 1), REFRESCO_MS);
    return () => clearInterval(t);
  }, []);

  const datos = useMemo(
    () => (paradero ? llegadasDeParadero(paradero.id) : null),
    // `tic` fuerza el refresco periódico aunque el paradero no cambie.
    [paradero, tic],
  );

  if (!paradero || !datos) {
    return (
      <Vacio
        titulo="No encontramos ese paradero"
        detalle="Puede estar fuera de la zona que la app tiene cargada."
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: paradero.codigo }} />
      <ScrollView style={s.pantalla} contentContainerStyle={s.contenido}>
        <Text style={s.nombre}>{paradero.nombre}</Text>
        <Text style={s.meta}>
          {paradero.codigo} · actualizado hace {datos.actualizadoHace} s
        </Text>

        <View style={s.lista}>
          {datos.aviso ? <TarjetaAviso aviso={datos.aviso} /> : null}
          {datos.llegadas.length === 0 ? (
            <Vacio titulo="Sin micros registradas en este paradero" />
          ) : (
            datos.llegadas.map((l, i) => <FilaLlegada key={`${l.recorrido}-${i}`} llegada={l} />)
          )}
        </View>

        <Text style={s.pie}>
          Los rangos muestran la incertidumbre real de cada estimación. Los tiempos son
          simulados hasta que el servidor esté en pie.
        </Text>
      </ScrollView>
    </>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: esp.lg, paddingBottom: esp.xxl },
    nombre: { ...tipo.titulo, color: c.texto },
    meta: { ...tipo.menor, color: c.textoTenue, marginTop: 4, marginBottom: esp.lg },
    lista: { gap: 0 },
    pie: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      marginTop: esp.xl,
      lineHeight: 18,
      paddingHorizontal: esp.md,
    },
  });
