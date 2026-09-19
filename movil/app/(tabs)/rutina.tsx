import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Interruptor } from "../../src/componentes/Interruptor";
import { Vacio } from "../../src/componentes/Vacio";
import { HAY_NOTIFICACIONES, reprogramar } from "../../src/notificaciones";
import { usePremium } from "../../src/premium";
import { PARADERO_POR_ID } from "../../src/red";
import { diasTexto, horaTexto, useRutinas } from "../../src/rutinas";
import { elevacion, esp, radio, tipo, useColores, type Colores } from "../../src/tema";

export default function PantallaRutina() {
  const c = useColores();
  const insets = useSafeAreaInsets();
  const s = estilos(c);
  const { rutinas, guardar, borrar } = useRutinas();
  const { esPremium, deSimulacion, activarPrueba } = usePremium();
  const [avisos, setAvisos] = useState<number | null>(null);

  // Cada vez que cambian las rutinas se reprograman los avisos del teléfono.
  useEffect(() => {
    if (!esPremium) return;
    reprogramar(rutinas, (id) => PARADERO_POR_ID.get(id)?.nombre ?? "tu paradero")
      .then(setAvisos)
      .catch(() => setAvisos(null));
  }, [rutinas, esPremium]);

  const alternarActiva = useCallback(
    (id: string, activa: boolean) => {
      const r = rutinas.find((x) => x.id === id);
      if (r) void guardar({ ...r, activa });
    },
    [rutinas, guardar],
  );

  return (
    <ScrollView
      style={s.pantalla}
      contentContainerStyle={[s.contenido, { paddingTop: insets.top + esp.md }]}
    >
      <Text style={s.titulo}>Mi rutina</Text>
      <Text style={s.bajada}>
        Dinos a qué hora tomas la micro y te avisamos antes, sin que tengas que
        abrir nada.
      </Text>

      {!esPremium ? <Muro /> : null}

      {rutinas.length === 0 ? (
        <Vacio
          titulo="Todavía no tienes rutinas"
          detalle="Toca un paradero en el mapa y elige «Avisarme a una hora»."
        />
      ) : (
        rutinas.map((r) => {
          const p = PARADERO_POR_ID.get(r.paraderoId);
          return (
            <View key={r.id} style={s.tarjeta}>
              <View style={s.cabecera}>
                <Text style={s.hora}>{horaTexto(r.hora)}</Text>
                <Pressable
                  onPress={() => void borrar(r.id)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Borrar rutina"
                >
                  <Text style={s.borrar}>✕</Text>
                </Pressable>
              </View>
              <Text style={s.paradero} numberOfLines={1}>
                {p?.nombre ?? r.paraderoId}
              </Text>
              <Text style={s.detalle}>
                {diasTexto(r.dias)} · aviso {r.avisoMinutos} min antes
              </Text>
              <View style={s.separador} />
              <Interruptor
                activo={r.activa}
                onCambiar={(v) => alternarActiva(r.id, v)}
                etiqueta="Activa"
              />
            </View>
          );
        })
      )}

      <Pressable style={s.boton} onPress={() => router.push("/")}>
        <Text style={s.botonTexto}>Agregar desde el mapa</Text>
      </Pressable>

      <Text style={s.pie}>
        {!HAY_NOTIFICACIONES
          ? "Los avisos funcionan en el teléfono, no en el navegador."
          : avisos === null
            ? "Los avisos se activan al dar permiso de notificaciones."
            : avisos === 0
              ? "Sin avisos programados."
              : `${avisos} ${avisos === 1 ? "aviso programado" : "avisos programados"} en tu teléfono.`}
      </Text>

      <View style={s.pruebas}>
        <Interruptor
          activo={deSimulacion}
          onCambiar={(v) => void activarPrueba(v)}
          etiqueta="Premium de prueba"
        />
        <Text style={s.pruebasNota}>
          Interruptor temporal para revisar cómo se ve la app con y sin
          suscripción. <Text style={s.pruebasFuerte}>No es un pago</Text>:
          desaparece cuando exista el cobro real.
        </Text>
      </View>
    </ScrollView>
  );
}

function Muro() {
  const c = useColores();
  const s = estilos(c);
  return (
    <View style={[s.muro, elevacion(c, 1)]}>
      <Text style={s.muroTitulo}>Incluido en la suscripción</Text>
      <Text style={s.muroCuerpo}>
        Las rutinas y los avisos son parte de la versión de pago. Saber cuándo
        llega tu micro es y seguirá siendo gratis; lo que se cobra es que la
        información te busque a ti.
      </Text>
      <Text style={s.muroPrecio}>Desde $1.490 al mes</Text>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: esp.lg, paddingBottom: esp.xxl },
    titulo: { ...tipo.titulo, color: c.texto },
    bajada: { ...tipo.menor, color: c.textoSuave, marginTop: 4, marginBottom: esp.lg, lineHeight: 19 },

    muro: {
      backgroundColor: c.marcaSuave,
      borderRadius: radio.md,
      padding: esp.lg,
      marginBottom: esp.lg,
    },
    muroTitulo: { ...tipo.cuerpoFuerte, color: c.marcaTexto },
    muroCuerpo: { ...tipo.menor, color: c.marcaTexto, marginTop: 4, lineHeight: 19 },
    muroPrecio: { ...tipo.cuerpoFuerte, color: c.marcaTexto, marginTop: esp.md },

    tarjeta: {
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
      marginBottom: esp.md,
    },
    cabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    hora: { ...tipo.titulo, color: c.texto },
    borrar: { fontSize: 16, color: c.textoTenue },
    paradero: { ...tipo.cuerpoFuerte, color: c.texto, marginTop: 2 },
    detalle: { ...tipo.menor, color: c.textoTenue, marginTop: 2 },
    separador: { height: StyleSheet.hairlineWidth, backgroundColor: c.bordeSuave, marginTop: esp.sm },

    boton: {
      backgroundColor: c.marca,
      borderRadius: radio.md,
      paddingVertical: esp.md,
      alignItems: "center",
      marginTop: esp.sm,
    },
    botonTexto: { ...tipo.cuerpoFuerte, color: "#fff" },

    pie: { ...tipo.menor, color: c.textoTenue, textAlign: "center", marginTop: esp.lg, lineHeight: 18 },

    pruebas: {
      marginTop: esp.xl,
      padding: esp.lg,
      borderRadius: radio.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borde,
      borderStyle: "dashed",
    },
    pruebasNota: { ...tipo.menor, color: c.textoTenue, lineHeight: 18 },
    pruebasFuerte: { fontWeight: "800", color: c.texto },
  });
