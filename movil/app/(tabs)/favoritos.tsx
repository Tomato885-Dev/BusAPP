import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { llegadasDeParadero } from "../../src/api";
import { FilaLlegada } from "../../src/componentes/FilaLlegada";
import { TarjetaAviso } from "../../src/componentes/TarjetaAviso";
import { Vacio } from "../../src/componentes/Vacio";
import { useFavoritos } from "../../src/favoritos";
import { PARADERO_POR_ID } from "../../src/red";
import { esp, radio, tipo, useColores, type Colores } from "../../src/tema";
import { useSesion } from "../../src/useSesion";

/** Cuántas micros se muestran por paradero antes de tener que entrar. */
const POR_PARADERO = 3;

export default function PantallaFavoritos() {
  const c = useColores();
  const insets = useSafeAreaInsets();
  const s = estilos(c);
  const { favoritos, alternar } = useFavoritos();
  const { conServidor, usuarioId } = useSesion();

  const paraderos = favoritos
    .map((id) => PARADERO_POR_ID.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <View style={[s.pantalla, { paddingTop: insets.top + esp.md }]}>
      <Text style={s.titulo}>Favoritos</Text>

      {paraderos.length === 0 ? (
        <Vacio
          titulo="Todavía no guardas ninguno"
          detalle="Toca un paradero en el mapa y aprieta la estrella para tenerlo siempre a mano."
        />
      ) : (
        <ScrollView contentContainerStyle={s.lista}>
          {paraderos.map((p) => {
            const datos = llegadasDeParadero(p.id);
            return (
              <Pressable
                key={p.id}
                style={s.tarjeta}
                onPress={() =>
                  router.push({ pathname: "/paradero/[id]", params: { id: p.id } })
                }
              >
                <View style={s.cabecera}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.nombre} numberOfLines={1}>
                      {p.nombre}
                    </Text>
                    <Text style={s.codigo}>{p.codigo}</Text>
                  </View>
                  <Pressable
                    onPress={() => alternar(p.id)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar de favoritos"
                  >
                    <Text style={s.estrella}>★</Text>
                  </Pressable>
                </View>

                {datos.aviso ? <TarjetaAviso aviso={datos.aviso} /> : null}

                {datos.llegadas.slice(0, POR_PARADERO).map((l, i) => (
                  <FilaLlegada key={`${l.recorrido}-${i}`} llegada={l} />
                ))}

                {datos.llegadas.length > POR_PARADERO ? (
                  <Text style={s.masTexto}>
                    y {datos.llegadas.length - POR_PARADERO} recorridos más
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Text style={s.pie}>
        {conServidor
          ? usuarioId
            ? "Tus favoritos se guardan en el servidor"
            : "Conectando con el servidor…"
          : "Tus favoritos se guardan en este dispositivo"}
      </Text>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    titulo: { ...tipo.titulo, color: c.texto, paddingHorizontal: esp.lg, marginBottom: esp.md },
    lista: { paddingHorizontal: esp.lg, paddingBottom: esp.xl },
    tarjeta: {
      backgroundColor: c.superficieAlta,
      borderRadius: radio.lg,
      padding: esp.md,
      marginBottom: esp.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.bordeSuave,
    },
    cabecera: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: esp.md,
      paddingHorizontal: esp.xs,
      paddingBottom: esp.md,
    },
    nombre: { ...tipo.subtitulo, color: c.texto },
    codigo: { ...tipo.menor, color: c.textoTenue, marginTop: 2 },
    estrella: { fontSize: 20, color: c.marca },
    masTexto: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      paddingTop: esp.sm,
    },
    pie: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      paddingVertical: esp.md,
      paddingHorizontal: esp.lg,
    },
  });
