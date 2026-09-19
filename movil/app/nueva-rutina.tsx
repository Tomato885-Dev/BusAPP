import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Vacio } from "../src/componentes/Vacio";
import { PARADERO_POR_ID } from "../src/red";
import { NOMBRES_DIAS, horaTexto, useRutinas } from "../src/rutinas";
import { type Colores, esp, fuente, radio, tipo, useColores } from "../src/tema";

/** Horas frecuentes de salida, para no obligar a ajustar minuto a minuto. */
const HORAS_RAPIDAS = [6 * 60 + 30, 7 * 60, 7 * 60 + 30, 8 * 60, 8 * 60 + 30, 18 * 60];
const AVISOS = [5, 10, 15, 20, 30];

export default function NuevaRutina() {
  const { paraderoId } = useLocalSearchParams<{ paraderoId: string }>();
  const c = useColores();
  const s = estilos(c);
  const { guardar } = useRutinas();

  const paradero = PARADERO_POR_ID.get(paraderoId);
  const [hora, setHora] = useState(7 * 60 + 30);
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [aviso, setAviso] = useState(15);
  const [guardando, setGuardando] = useState(false);

  if (!paradero) {
    return <Vacio titulo="No encontramos ese paradero" />;
  }

  const alternarDia = (d: number) =>
    setDias((actuales) =>
      actuales.includes(d) ? actuales.filter((x) => x !== d) : [...actuales, d],
    );

  const confirmar = async () => {
    if (dias.length === 0) return;
    setGuardando(true);
    await guardar({
      paraderoId: paradero.id,
      hora,
      dias,
      avisoMinutos: aviso,
      activa: true,
    });
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: "Nueva rutina", presentation: "modal" }} />
      <ScrollView style={s.pantalla} contentContainerStyle={s.contenido}>
        <Text style={s.paradero} numberOfLines={2}>
          {paradero.nombre}
        </Text>
        <Text style={s.codigo}>{paradero.codigo}</Text>

        <Text style={s.seccion}>¿A qué hora la tomas?</Text>
        <View style={s.horaCaja}>
          <Pressable
            onPress={() => setHora((h) => Math.max(0, h - 5))}
            style={s.ajuste}
            accessibilityRole="button"
            accessibilityLabel="Cinco minutos antes"
          >
            <Text style={s.ajusteTexto}>−</Text>
          </Pressable>
          <Text style={s.horaGrande}>{horaTexto(hora)}</Text>
          <Pressable
            onPress={() => setHora((h) => Math.min(1439, h + 5))}
            style={s.ajuste}
            accessibilityRole="button"
            accessibilityLabel="Cinco minutos después"
          >
            <Text style={s.ajusteTexto}>+</Text>
          </Pressable>
        </View>

        <View style={s.chips}>
          {HORAS_RAPIDAS.map((h) => (
            <Pressable
              key={h}
              onPress={() => setHora(h)}
              style={[s.chip, hora === h && s.chipActivo]}
            >
              <Text style={[s.chipTexto, hora === h && s.chipTextoActivo]}>
                {horaTexto(h)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.seccion}>¿Qué días?</Text>
        <View style={s.dias}>
          {NOMBRES_DIAS.map((nombre, i) => {
            const d = i + 1;
            const activo = dias.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => alternarDia(d)}
                style={[s.dia, activo && s.diaActivo]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: activo }}
              >
                <Text style={[s.diaTexto, activo && s.diaTextoActivo]}>{nombre}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={s.seccion}>¿Cuánto antes te avisamos?</Text>
        <View style={s.chips}>
          {AVISOS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setAviso(m)}
              style={[s.chip, aviso === m && s.chipActivo]}
            >
              <Text style={[s.chipTexto, aviso === m && s.chipTextoActivo]}>
                {m} min
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={s.resumen}>
          <Text style={s.resumenTexto}>
            Te avisaremos a las{" "}
            <Text style={s.resumenFuerte}>{horaTexto(Math.max(0, hora - aviso))}</Text>{" "}
            con las micros que vienen a este paradero.
          </Text>
        </View>

        <Pressable
          style={[s.boton, dias.length === 0 && s.botonApagado]}
          onPress={confirmar}
          disabled={dias.length === 0 || guardando}
        >
          <Text style={s.botonTexto}>
            {guardando ? "Guardando…" : "Crear rutina"}
          </Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: esp.lg, paddingBottom: esp.xxl },
    paradero: { ...tipo.titulo, color: c.texto },
    codigo: { ...tipo.menor, color: c.textoTenue, marginTop: 2 },

    seccion: { ...tipo.cuerpoFuerte, color: c.texto, marginTop: esp.xl, marginBottom: esp.md },

    horaCaja: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.sm,
    },
    ajuste: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
    ajusteTexto: { fontFamily: fuente.semi, fontSize: 26, color: c.marca },
    horaGrande: { ...tipo.gigante, color: c.texto },

    chips: { flexDirection: "row", flexWrap: "wrap", gap: esp.sm, marginTop: esp.md },
    chip: {
      paddingHorizontal: esp.md,
      paddingVertical: esp.sm,
      borderRadius: radio.pastilla,
      backgroundColor: c.superficie,
    },
    chipActivo: { backgroundColor: c.marca },
    chipTexto: { ...tipo.menor, color: c.textoSuave },
    chipTextoActivo: { color: "#fff", fontFamily: fuente.fuerte },

    dias: { flexDirection: "row", gap: esp.sm },
    dia: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radio.sm,
      backgroundColor: c.superficie,
      alignItems: "center",
      justifyContent: "center",
    },
    diaActivo: { backgroundColor: c.marca },
    diaTexto: { ...tipo.cuerpoFuerte, color: c.textoSuave },
    diaTextoActivo: { color: "#fff" },

    resumen: {
      marginTop: esp.xl,
      padding: esp.lg,
      borderRadius: radio.md,
      backgroundColor: c.marcaSuave,
    },
    resumenTexto: { ...tipo.menor, color: c.marcaTexto, lineHeight: 20 },
    resumenFuerte: { fontFamily: fuente.extra },

    boton: {
      backgroundColor: c.marca,
      borderRadius: radio.md,
      paddingVertical: esp.md + 2,
      alignItems: "center",
      marginTop: esp.xl,
    },
    botonApagado: { opacity: 0.4 },
    botonTexto: { ...tipo.cuerpoFuerte, color: "#fff" },
  });
