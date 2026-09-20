import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import {
  estaOperando,
  NOMBRE_DE_TIPO,
  recorridosDeTipo,
  type Recorrido,
  type TipoParada,
} from "../src/red";
import { esp, fuente, radio, tipo, useColores, type Colores } from "../src/tema";

/** Los tres modos, en el orden en que la gente los usa en Santiago. */
const MODOS: { tipo: TipoParada; titulo: string }[] = [
  { tipo: 3, titulo: "Micros" },
  { tipo: 1, titulo: "Metro" },
  { tipo: 0, titulo: "Tren" },
];

export default function PantallaLineas() {
  const c = useColores();
  const s = estilos(c);
  const [modo, setModo] = useState<TipoParada>(3);
  const [filtro, setFiltro] = useState("");

  const lineas = useMemo(() => {
    const todas = recorridosDeTipo(modo);
    const texto = filtro.trim().toLowerCase();
    if (!texto) return todas;
    return todas.filter(
      (r) =>
        r.nombre.toLowerCase().includes(texto) ||
        r.destino.toLowerCase().includes(texto),
    );
  }, [modo, filtro]);

  const operando = useMemo(() => lineas.filter((r) => estaOperando(r)).length, [lineas]);
  // Cada sentido es una entrada, pero para el pasajero «517» es una línea, no
  // dos. El resumen cuenta nombres distintos; la lista sigue mostrando los dos
  // sentidos, que es lo que permite elegir el correcto.
  const cuantasLineas = useMemo(() => new Set(lineas.map((r) => r.nombre)).size, [lineas]);

  return (
    <>
      <Stack.Screen options={{ title: "Líneas" }} />
      <View style={s.pantalla}>
        <View style={s.modos}>
          {MODOS.map((m) => {
            const activo = m.tipo === modo;
            return (
              <Pressable
                key={m.tipo}
                onPress={() => setModo(m.tipo)}
                style={[s.modo, activo && s.modoActivo]}
                accessibilityRole="button"
              >
                <Text style={[s.modoTexto, activo && s.modoTextoActivo]}>{m.titulo}</Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={filtro}
          onChangeText={setFiltro}
          placeholder="Buscar una línea"
          placeholderTextColor={c.textoTenue}
          style={s.buscador}
        />

        <Text style={s.resumen}>
          {cuantasLineas} {cuantasLineas === 1 ? "línea" : "líneas"} ·{" "}
          {lineas.length} {lineas.length === 1 ? "sentido" : "sentidos"} ·{" "}
          <Text style={{ color: operando > 0 ? c.ok : c.textoTenue }}>
            {operando} en servicio
          </Text>
        </Text>

        <ScrollView contentContainerStyle={s.lista} keyboardShouldPersistTaps="handled">
          {lineas.map((r) => (
            <FilaLinea key={r.id} recorrido={r} />
          ))}
          {lineas.length === 0 ? (
            <Text style={s.vacio}>Ninguna línea con ese nombre.</Text>
          ) : null}
          <Text style={s.pie}>
            El estado sale de las frecuencias oficiales del DTPM. Una línea «fuera de
            servicio» no está fallando: no es su horario.
          </Text>
        </ScrollView>
      </View>
    </>
  );
}

function FilaLinea({ recorrido }: { recorrido: Recorrido }) {
  const c = useColores();
  const s = estilos(c);
  const activa = estaOperando(recorrido);

  return (
    <Pressable
      style={s.fila}
      onPress={() => router.push({ pathname: "/linea/[id]", params: { id: recorrido.id } })}
      accessibilityRole="button"
    >
      <View style={[s.insignia, !activa && { backgroundColor: c.neutro }]}>
        <Text style={s.insigniaTexto} numberOfLines={1}>
          {recorrido.nombre}
        </Text>
      </View>
      <View style={s.medio}>
        <Text style={s.destino} numberOfLines={1}>
          {recorrido.destino}
        </Text>
        <View style={s.estadoFila}>
          <View style={[s.punto, { backgroundColor: activa ? c.ok : c.neutro }]} />
          <Text style={[s.estado, { color: activa ? c.ok : c.textoTenue }]}>
            {activa ? "En servicio" : "Fuera de servicio a esta hora"}
          </Text>
        </View>
      </View>
      <Text style={s.flecha}>›</Text>
    </Pressable>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo, paddingTop: esp.md },

    modos: {
      flexDirection: "row",
      gap: 4,
      backgroundColor: c.neutroFondo,
      borderRadius: radio.pastilla,
      padding: 4,
      marginHorizontal: esp.lg,
    },
    modo: {
      flex: 1,
      paddingVertical: esp.sm,
      borderRadius: radio.pastilla,
      alignItems: "center",
    },
    modoActivo: { backgroundColor: c.superficie },
    modoTexto: { ...tipo.menor, fontFamily: fuente.fuerte, color: c.textoTenue },
    modoTextoActivo: { color: c.texto },

    buscador: {
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      paddingHorizontal: esp.lg,
      paddingVertical: esp.md,
      marginHorizontal: esp.lg,
      marginTop: esp.md,
      ...tipo.cuerpo,
      color: c.texto,
    },
    resumen: {
      ...tipo.menor,
      color: c.textoTenue,
      marginHorizontal: esp.lg,
      marginTop: esp.md,
      marginBottom: esp.sm,
    },

    lista: { paddingHorizontal: esp.lg, paddingBottom: esp.xxl },
    fila: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.md,
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      paddingVertical: esp.md,
      paddingHorizontal: esp.lg,
      marginBottom: 6,
    },
    insignia: {
      minWidth: 54,
      paddingHorizontal: esp.sm,
      height: 32,
      borderRadius: radio.sm,
      backgroundColor: c.texto,
      alignItems: "center",
      justifyContent: "center",
    },
    insigniaTexto: { ...tipo.cuerpoFuerte, color: c.textoInverso },
    medio: { flex: 1, minWidth: 0 },
    destino: { ...tipo.cuerpo, color: c.texto },
    estadoFila: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
    punto: { width: 6, height: 6, borderRadius: 3 },
    estado: { ...tipo.menor },
    flecha: { fontSize: 22, color: c.textoTenue },

    vacio: { ...tipo.cuerpo, color: c.textoTenue, textAlign: "center", padding: esp.xl },
    pie: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      marginTop: esp.lg,
      lineHeight: 18,
      paddingHorizontal: esp.md,
    },
  });
