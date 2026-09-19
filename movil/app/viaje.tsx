import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PARADERO_POR_ID, recorridosDe, RECORRIDO_POR_ID } from "../src/red";
import { esp, radio, tipo, useColores, type Colores } from "../src/tema";
import { useViaje } from "../src/viaje";

/** Cuántas paradas antes se puede pedir el aviso. */
const OPCIONES_AVISO = [1, 2, 3];

export default function PantallaViaje() {
  const { paraderoId } = useLocalSearchParams<{ paraderoId: string }>();
  const c = useColores();
  const s = estilos(c);
  const { iniciar } = useViaje();

  const paradero = PARADERO_POR_ID.get(paraderoId);
  const recorridos = useMemo(() => (paraderoId ? recorridosDe(paraderoId) : []), [paraderoId]);

  const [recorridoId, setRecorridoId] = useState<string | null>(null);
  const [avisoParadas, setAvisoParadas] = useState(2);
  const [filtro, setFiltro] = useState("");

  // Sólo las paradas que vienen **después** de donde se subió. Ofrecer las
  // anteriores sería ofrecer un viaje imposible.
  const porDelante = useMemo(() => {
    if (!recorridoId || !paraderoId) return [];
    const r = RECORRIDO_POR_ID.get(recorridoId);
    if (!r) return [];
    const desde = r.paradas.indexOf(paraderoId);
    if (desde < 0) return [];
    return r.paradas
      .map((id, i) => ({ id, i, paradero: PARADERO_POR_ID.get(id) }))
      .slice(desde + 1)
      .filter((p) => p.paradero);
  }, [recorridoId, paraderoId]);

  const visibles = useMemo(() => {
    const texto = filtro.trim().toLowerCase();
    const lista = texto
      ? porDelante.filter((p) => p.paradero!.nombre.toLowerCase().includes(texto))
      : porDelante;
    return lista.slice(0, 60);
  }, [porDelante, filtro]);

  if (!paradero) {
    return (
      <>
        <Stack.Screen options={{ title: "Voy en camino" }} />
        <View style={s.pantalla}>
          <Text style={s.vacio}>No encontramos ese paradero.</Text>
        </View>
      </>
    );
  }

  const elegirDestino = async (indiceDestino: number) => {
    const r = RECORRIDO_POR_ID.get(recorridoId!);
    if (!r) return;
    const desde = r.paradas.indexOf(paraderoId);
    await iniciar({
      recorridoId: recorridoId!,
      desde,
      hasta: indiceDestino,
      avisoParadas,
    });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: "Voy en camino", presentation: "modal" }} />
      <ScrollView style={s.pantalla} contentContainerStyle={s.contenido}>
        <Text style={s.paso}>Te subiste en</Text>
        <Text style={s.paradero}>{paradero.nombre}</Text>

        <Text style={s.paso}>¿En qué micro vas?</Text>
        <View style={s.pastillas}>
          {recorridos.map((r) => {
            const elegido = r.id === recorridoId;
            return (
              <Pressable
                key={r.id}
                onPress={() => setRecorridoId(elegido ? null : r.id)}
                style={[s.pastilla, elegido && s.pastillaElegida]}
                accessibilityRole="button"
              >
                <Text style={[s.pastillaTexto, elegido && s.pastillaTextoElegido]}>
                  {r.nombre}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {recorridoId ? (
          <>
            <Text style={s.paso}>Avísame</Text>
            <View style={s.pastillas}>
              {OPCIONES_AVISO.map((n) => {
                const elegido = n === avisoParadas;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setAvisoParadas(n)}
                    style={[s.pastilla, elegido && s.pastillaElegida]}
                    accessibilityRole="button"
                  >
                    <Text style={[s.pastillaTexto, elegido && s.pastillaTextoElegido]}>
                      {n === 1 ? "1 parada antes" : `${n} paradas antes`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.paso}>¿Dónde te bajas?</Text>
            <TextInput
              value={filtro}
              onChangeText={setFiltro}
              placeholder="Buscar la parada"
              placeholderTextColor={c.textoTenue}
              style={s.buscador}
            />
            {visibles.length === 0 ? (
              <Text style={s.vacio}>
                {porDelante.length === 0
                  ? "Esta micro no sigue más allá de este paradero."
                  : "Ninguna parada con ese nombre en lo que falta del recorrido."}
              </Text>
            ) : (
              visibles.map((p, orden) => (
                <Pressable
                  key={`${p.id}-${p.i}`}
                  style={s.parada}
                  onPress={() => elegirDestino(p.i)}
                  accessibilityRole="button"
                >
                  <Text style={s.paradaNumero}>{orden + 1}</Text>
                  <Text style={s.paradaNombre} numberOfLines={1}>
                    {p.paradero!.nombre}
                  </Text>
                </Pressable>
              ))
            )}
            {porDelante.length > visibles.length ? (
              <Text style={s.masAbajo}>
                Se muestran las primeras {visibles.length}. Busca por nombre para llegar
                más lejos.
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={s.ayuda}>
            Elige la micro a la que te subiste y te decimos cuántas paradas faltan para
            bajarte.
          </Text>
        )}
      </ScrollView>
    </>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: esp.lg, paddingBottom: esp.xxl },

    paso: {
      ...tipo.micro,
      color: c.textoTenue,
      textTransform: "uppercase",
      marginTop: esp.lg,
      marginBottom: esp.sm,
    },
    paradero: { ...tipo.subtitulo, color: c.texto },

    pastillas: { flexDirection: "row", flexWrap: "wrap", gap: esp.sm },
    pastilla: {
      paddingVertical: esp.sm,
      paddingHorizontal: esp.lg,
      borderRadius: radio.pastilla,
      backgroundColor: c.superficie,
      borderWidth: 1,
      borderColor: c.borde,
    },
    pastillaElegida: { backgroundColor: c.marca, borderColor: c.marca },
    pastillaTexto: { ...tipo.cuerpoFuerte, color: c.texto },
    pastillaTextoElegido: { color: c.textoInverso },

    buscador: {
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      paddingHorizontal: esp.lg,
      paddingVertical: esp.md,
      ...tipo.cuerpo,
      color: c.texto,
      marginBottom: esp.sm,
    },

    parada: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.md,
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      paddingVertical: esp.md,
      paddingHorizontal: esp.lg,
      marginBottom: 6,
    },
    paradaNumero: {
      ...tipo.menor,
      color: c.textoTenue,
      minWidth: 22,
      fontVariant: ["tabular-nums"],
    },
    paradaNombre: { ...tipo.cuerpo, color: c.texto, flex: 1 },

    ayuda: { ...tipo.cuerpo, color: c.textoSuave, marginTop: esp.md, lineHeight: 21 },
    vacio: { ...tipo.cuerpo, color: c.textoTenue, padding: esp.lg, textAlign: "center" },
    masAbajo: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      marginTop: esp.sm,
    },
  });
