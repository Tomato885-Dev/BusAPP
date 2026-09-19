import * as Location from "expo-location";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { llegadasDeParadero } from "../../src/api";
import { FilaLlegada } from "../../src/componentes/FilaLlegada";
import { TarjetaAviso } from "../../src/componentes/TarjetaAviso";
import { Vacio } from "../../src/componentes/Vacio";
import { registrarConsulta } from "../../src/estadisticas";
import { useFavoritos } from "../../src/favoritos";
import { usePremium } from "../../src/premium";
import { distanciaM } from "../../src/mapa/proyeccion";
import { PARADERO_POR_ID } from "../../src/red";
import { esp, radio, tipo, useColores, type Colores } from "../../src/tema";
import { useSesion } from "../../src/useSesion";

/** Cada cuánto se vuelve a pedir la estimación. */
const REFRESCO_MS = 20_000;

/** Velocidad a pie, en m/s. Caminata urbana normal, no paseo ni trote. */
const VELOCIDAD_A_PIE = 1.3;

export default function PantallaParadero() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColores();
  const s = estilos(c);

  const { esFavorito, alternar, cupo } = useFavoritos();
  const { esPremium } = usePremium();
  const { usuarioId } = useSesion();
  const paradero = PARADERO_POR_ID.get(id);

  const [consultadoEn, setConsultadoEn] = useState(() => Date.now());
  const [refrescando, setRefrescando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [metrosAPie, setMetrosAPie] = useState<number | null>(null);
  const [topeAlcanzado, setTopeAlcanzado] = useState(false);

  // El contador de frescura avanza cada segundo; la estimación se rehace cada
  // REFRESCO_MS. Son dos ritmos distintos a propósito: el usuario tiene que ver
  // envejecer el dato aunque todavía no toque volver a pedirlo.
  useEffect(() => {
    const t = setInterval(() => setSegundos((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (segundos > 0 && segundos % (REFRESCO_MS / 1000) === 0) setConsultadoEn(Date.now());
  }, [segundos]);

  // Queda registrado que miró este paradero: es lo que alimenta «Tus números».
  useEffect(() => {
    if (paradero) registrarConsulta(usuarioId, paradero.id);
  }, [paradero, usuarioId]);

  // Distancia a pie, sólo si el permiso **ya** estaba dado. Abrir un paradero no
  // es motivo para pedirle la ubicación a nadie.
  useEffect(() => {
    if (!paradero) return;
    let vigente = true;
    (async () => {
      try {
        const permiso = await Location.getForegroundPermissionsAsync();
        if (!permiso.granted) return;
        const pos = await Location.getCurrentPositionAsync({});
        if (!vigente) return;
        setMetrosAPie(
          distanciaM({ lat: pos.coords.latitude, lon: pos.coords.longitude }, paradero),
        );
      } catch {
        // Sin ubicación la pantalla sirve igual, sólo sin la distancia.
      }
    })();
    return () => {
      vigente = false;
    };
  }, [paradero]);

  const datos = useMemo(
    () => (paradero ? llegadasDeParadero(paradero.id) : null),
    [paradero, consultadoEn],
  );

  const alRefrescar = useCallback(() => {
    setRefrescando(true);
    setConsultadoEn(Date.now());
    setSegundos(0);
    setTimeout(() => setRefrescando(false), 400);
  }, []);

  if (!paradero || !datos) {
    return (
      <>
        <Stack.Screen options={{ title: "Paradero" }} />
        <Vacio
          titulo="No encontramos ese paradero"
          detalle="Puede estar fuera de la zona que la app tiene cargada."
        />
      </>
    );
  }

  // La separación es la propuesta de valor hecha pantalla: lo que viene arriba,
  // y lo que **no** viene abajo, dicho sin rodeos en vez de tachado en la lista.
  const vienen = datos.llegadas.filter(
    (l) => l.estado !== "no_llegara" && l.etaSegundos !== null,
  );
  const noVienen = datos.llegadas.filter(
    (l) => l.estado === "no_llegara" || l.etaSegundos === null,
  );

  const favorito = esFavorito(paradero.id);
  const frescura = Math.min(datos.actualizadoHace + segundos, 999);

  return (
    <>
      <Stack.Screen
        options={{
          title: paradero.codigo,
          headerRight: () => (
            <Pressable
              onPress={() => {
                if (!alternar(paradero.id)) setTopeAlcanzado(true);
              }}
              hitSlop={14}
              accessibilityRole="button"
              accessibilityLabel={favorito ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              <Text style={[s.estrella, favorito && { color: c.marca }]}>
                {favorito ? "★" : "☆"}
              </Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={s.pantalla}
        contentContainerStyle={s.contenido}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={alRefrescar}
            tintColor={c.marca}
            colors={[c.marca]}
          />
        }
      >
        <Text style={s.nombre}>{paradero.nombre}</Text>

        <View style={s.metaFila}>
          <Text style={s.meta}>{paradero.codigo}</Text>
          {metrosAPie !== null ? (
            <>
              <Text style={s.metaPunto}>·</Text>
              <Text style={s.meta}>{aPieTexto(metrosAPie)}</Text>
            </>
          ) : null}
          <Text style={s.metaPunto}>·</Text>
          <View style={s.pulso} />
          <Text style={s.meta}>hace {frescura} s</Text>
        </View>

        {topeAlcanzado ? (
          <Pressable style={s.tope} onPress={() => router.push("/rutina")}>
            <Text style={s.topeTexto}>
              Llegaste a tus {cupo.tope} favoritos del plan gratis. Con Premium son
              ilimitados.
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          style={s.accionPrincipal}
          onPress={() =>
            esPremium
              ? router.push({ pathname: "/viaje", params: { paraderoId: paradero.id } })
              : router.push("/rutina")
          }
          accessibilityRole="button"
          accessibilityLabel="Me subí a una micro: avisarme antes de bajarme"
        >
          <Text style={s.accionPrincipalIcono}>{esPremium ? "▸" : "◌"}</Text>
          <View style={s.accionPrincipalMedio}>
            <Text style={s.accionPrincipalTexto}>Me subí a una micro</Text>
            <Text style={s.accionPrincipalDetalle}>
              {esPremium
                ? "Te avisamos antes de que tengas que bajarte"
                : "Con Kupay Premium te avisamos antes de bajarte"}
            </Text>
          </View>
        </Pressable>

        <View style={s.acciones}>
          <Pressable
            style={s.accion}
            onPress={() =>
              router.push({ pathname: "/nueva-rutina", params: { paraderoId: paradero.id } })
            }
            accessibilityRole="button"
          >
            <Text style={s.accionIcono}>◷</Text>
            <Text style={s.accionTexto}>Avisarme a una hora</Text>
          </Pressable>
          <Pressable
            style={s.accion}
            onPress={() => router.push({ pathname: "/", params: { paraderoId: paradero.id } })}
            accessibilityRole="button"
          >
            <Text style={s.accionIcono}>◎</Text>
            <Text style={s.accionTexto}>Ver en el mapa</Text>
          </Pressable>
        </View>

        {datos.aviso ? <TarjetaAviso aviso={datos.aviso} /> : null}

        {vienen.length > 0 ? (
          <>
            <Text style={s.seccion}>Vienen ahora</Text>
            {vienen.map((l, i) => (
              <FilaLlegada key={`v-${l.recorrido}-${i}`} llegada={l} />
            ))}
          </>
        ) : (
          <View style={s.nadaViene}>
            <Text style={s.nadaVieneTitulo}>Ninguna micro viene en camino</Text>
            <Text style={s.nadaVieneCuerpo}>
              Puede ser por la hora, o porque los recorridos de este paradero están
              detenidos. Revisa abajo.
            </Text>
          </View>
        )}

        {noVienen.length > 0 ? (
          <>
            <Text style={s.seccion}>No pasan por aquí ahora</Text>
            <Text style={s.seccionDetalle}>
              Están fuera de horario o se desviaron. No sirve esperarlas.
            </Text>
            {noVienen.map((l, i) => (
              <FilaLlegada key={`n-${l.recorrido}-${i}`} llegada={l} />
            ))}
          </>
        ) : null}

        <Text style={s.pie}>
          Los rangos muestran la incertidumbre real de cada estimación: cuando Kupay no
          sabe, lo dice. Los tiempos son simulados hasta que el servidor esté en pie.
        </Text>
      </ScrollView>
    </>
  );
}

/** «a 4 min caminando», o los metros cuando está tan cerca que el tiempo no informa. */
function aPieTexto(metros: number): string {
  if (metros < 80) return "estás al lado";
  const min = Math.max(1, Math.round(metros / VELOCIDAD_A_PIE / 60));
  return `a ${min} min caminando`;
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: esp.lg, paddingBottom: esp.xxl },

    estrella: { fontSize: 24, color: c.textoTenue, paddingHorizontal: esp.sm },

    nombre: { ...tipo.titulo, color: c.texto },
    metaFila: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 5,
      flexWrap: "wrap",
    },
    meta: { ...tipo.menor, color: c.textoTenue },
    metaPunto: { ...tipo.menor, color: c.textoTenue },
    pulso: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.ok },

    tope: {
      backgroundColor: c.avisoFondo,
      borderRadius: radio.md,
      padding: esp.md,
      marginTop: esp.md,
    },
    topeTexto: { ...tipo.menor, color: c.aviso, lineHeight: 19 },

    accionPrincipal: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.md,
      backgroundColor: c.marca,
      borderRadius: radio.md,
      paddingVertical: esp.md,
      paddingHorizontal: esp.lg,
      marginTop: esp.lg,
    },
    accionPrincipalIcono: { fontSize: 20, color: c.textoInverso },
    accionPrincipalMedio: { flex: 1, minWidth: 0 },
    accionPrincipalTexto: { ...tipo.cuerpoFuerte, color: c.textoInverso },
    accionPrincipalDetalle: {
      ...tipo.menor,
      color: c.textoInverso,
      opacity: 0.85,
      marginTop: 1,
    },

    acciones: { flexDirection: "row", gap: esp.sm, marginTop: esp.sm, marginBottom: esp.lg },
    accion: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: esp.md,
      paddingHorizontal: esp.sm,
      borderRadius: radio.md,
      backgroundColor: c.marcaSuave,
    },
    accionIcono: { fontSize: 16, color: c.marcaTexto },
    accionTexto: { ...tipo.menor, fontWeight: "700", color: c.marcaTexto },

    seccion: {
      ...tipo.micro,
      color: c.textoTenue,
      textTransform: "uppercase",
      marginTop: esp.lg,
      marginBottom: esp.sm,
    },
    seccionDetalle: {
      ...tipo.menor,
      color: c.textoTenue,
      marginTop: -4,
      marginBottom: esp.sm,
      lineHeight: 18,
    },

    nadaViene: {
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
      marginTop: esp.sm,
    },
    nadaVieneTitulo: { ...tipo.cuerpoFuerte, color: c.texto },
    nadaVieneCuerpo: {
      ...tipo.menor,
      color: c.textoSuave,
      marginTop: 4,
      lineHeight: 19,
    },

    pie: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      marginTop: esp.xl,
      lineHeight: 18,
      paddingHorizontal: esp.md,
    },
  });
