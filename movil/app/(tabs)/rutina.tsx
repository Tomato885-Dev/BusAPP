import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Interruptor } from "../../src/componentes/Interruptor";
import { esperaTexto, misEstadisticas, type Estadisticas } from "../../src/estadisticas";
import { useFavoritos } from "../../src/favoritos";
import { LIMITE_FAVORITOS, LIMITE_RUTINAS } from "../../src/limites";
import { usePremium } from "../../src/premium";
import { diasTexto, horaTexto, useRutinas } from "../../src/rutinas";
import { PARADERO_POR_ID } from "../../src/red";
import { esp, radio, tipo, useColores, type Colores } from "../../src/tema";
import { useSesion } from "../../src/useSesion";

/** Las funciones del plan pagado, en el orden en que se explican. */
const FUNCIONES: { icono: string; titulo: string; cuerpo: string; lista?: boolean }[] = [
  {
    icono: "▸",
    titulo: "Avísame antes de bajarme",
    cuerpo:
      "Le dices dónde te bajas y Kupay te avisa dos paradas antes. Sirve con audífonos, con sueño o en un recorrido que no conoces.",
  },
  {
    icono: "◷",
    titulo: "Rutinas ilimitadas",
    cuerpo:
      "Ida y vuelta, días distintos, paraderos distintos. Tu semana no cabe en una sola rutina.",
  },
  {
    icono: "↗",
    titulo: "Aviso de salida",
    cuerpo:
      "No «tu micro llega en 7 minutos», sino «sal en 3». Kupay sabe a cuánto estás caminando y resta.",
  },
  {
    icono: "✕",
    titulo: "Alertas de desvío",
    cuerpo:
      "Si un recorrido del que dependes se desvía, te enteras sin abrir la app.",
  },
  {
    icono: "★",
    titulo: "Favoritos ilimitados",
    cuerpo: "Todos los paraderos que uses, no sólo tres.",
  },
  {
    icono: "▤",
    titulo: "Tus números",
    cuerpo:
      "Cuánto esperaste este mes y qué recorrido te falla más. Son datos tuyos.",
  },
];

export default function PantallaPremium() {
  const c = useColores();
  const s = estilos(c);
  const insets = useSafeAreaInsets();

  const { esPremium, deSimulacion, activarPrueba } = usePremium();
  const { rutinas, borrar, cupo: cupoRutinas } = useRutinas();
  const { cupo: cupoFavoritos } = useFavoritos();
  const { usuarioId } = useSesion();
  const [numeros, setNumeros] = useState<Estadisticas | null>(null);

  useEffect(() => {
    if (!esPremium || !usuarioId) return;
    let vigente = true;
    misEstadisticas().then((e) => {
      if (vigente) setNumeros(e);
    });
    return () => {
      vigente = false;
    };
  }, [esPremium, usuarioId]);

  return (
    <ScrollView
      style={s.pantalla}
      contentContainerStyle={[s.contenido, { paddingTop: insets.top + esp.lg }]}
    >
      <Text style={s.titulo}>{esPremium ? "Kupay Premium" : "Kupay Premium"}</Text>
      <Text style={s.bajada}>
        Saber si tu micro viene es y va a seguir siendo gratis. Lo que se paga es que
        Kupay te busque a ti.
      </Text>

      {esPremium ? (
        <>
          <MisRutinas rutinas={rutinas} borrar={borrar} c={c} s={s} />
          <TusNumeros numeros={numeros} c={c} s={s} />
          <Text style={s.seccion}>Lo que incluye</Text>
          {FUNCIONES.map((f) => (
            <Funcion key={f.titulo} {...f} activa s={s} />
          ))}
          <Bloqueadas s={s} />
        </>
      ) : (
        <>
          <View style={s.tarjetaPlan}>
            <Text style={s.planTitulo}>Tu plan gratis incluye</Text>
            <Text style={s.planLinea}>· El mapa completo y todos los paraderos</Text>
            <Text style={s.planLinea}>· Ver si una micro viene o no viene</Text>
            <Text style={s.planLinea}>· El planificador de viajes</Text>
            <Text style={s.planLinea}>
              · {LIMITE_FAVORITOS} favoritos {cupoFavoritos.tope !== null
                ? `(llevas ${cupoFavoritos.usados})`
                : ""}
            </Text>
            <Text style={s.planLinea}>
              · {LIMITE_RUTINAS} rutina {cupoRutinas.tope !== null
                ? `(llevas ${cupoRutinas.usados})`
                : ""}
            </Text>
          </View>

          <Text style={s.seccion}>Con Premium</Text>
          {FUNCIONES.map((f) => (
            <Funcion key={f.titulo} {...f} s={s} />
          ))}

          <View style={s.precio}>
            <Text style={s.precioMonto}>Desde $1.490 al mes</Text>
            <Text style={s.precioNota}>
              El cobro todavía no está disponible: falta la cuenta de desarrollador.
              Mientras tanto, prueba las funciones con el interruptor de abajo.
            </Text>
          </View>

          <Bloqueadas s={s} />
        </>
      )}

      <View style={s.pruebas}>
        <View style={s.pruebasFila}>
          <Text style={s.pruebasTexto}>Simular suscripción</Text>
          <Interruptor
            activo={deSimulacion}
            onCambiar={activarPrueba}
            etiqueta="Simular suscripción"
          />
        </View>
        <Text style={s.pruebasNota}>
          Interruptor temporal para revisar cómo se ve la app con y sin suscripción.{" "}
          <Text style={s.pruebasFuerte}>No es un pago</Text>: vale sólo en este
          teléfono y desaparece cuando exista el cobro real.
        </Text>
      </View>
    </ScrollView>
  );
}

function Funcion({
  icono,
  titulo,
  cuerpo,
  activa,
  s,
}: {
  icono: string;
  titulo: string;
  cuerpo: string;
  activa?: boolean;
  s: ReturnType<typeof estilos>;
}) {
  return (
    <View style={s.funcion}>
      <Text style={[s.funcionIcono, activa && s.funcionIconoActiva]}>{icono}</Text>
      <View style={s.funcionMedio}>
        <Text style={s.funcionTitulo}>{titulo}</Text>
        <Text style={s.funcionCuerpo}>{cuerpo}</Text>
      </View>
    </View>
  );
}

function MisRutinas({
  rutinas,
  borrar,
  c,
  s,
}: {
  rutinas: ReturnType<typeof useRutinas>["rutinas"];
  borrar: (id: string) => Promise<void>;
  c: Colores;
  s: ReturnType<typeof estilos>;
}) {
  return (
    <>
      <Text style={s.seccion}>Mis rutinas</Text>
      {rutinas.length === 0 ? (
        <Text style={s.vacio}>
          Todavía no tienes ninguna. Se crean desde el paradero, con «Avisarme a una
          hora».
        </Text>
      ) : (
        rutinas.map((r) => (
          <View key={r.id} style={s.rutina}>
            <View style={s.rutinaCabecera}>
              <Text style={s.hora}>{horaTexto(r.hora)}</Text>
              <Pressable
                onPress={() => borrar(r.id)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Borrar la rutina"
              >
                <Text style={s.borrar}>✕</Text>
              </Pressable>
            </View>
            <Text style={s.paradero} numberOfLines={1}>
              {PARADERO_POR_ID.get(r.paraderoId)?.nombre ?? r.paraderoId}
            </Text>
            <Text style={s.detalle}>
              {diasTexto(r.dias)} · aviso {r.avisoMinutos} min antes
            </Text>
          </View>
        ))
      )}
      <Pressable style={s.boton} onPress={() => router.push("/")}>
        <Text style={s.botonTexto}>Agregar desde el mapa</Text>
      </Pressable>
    </>
  );
}

function TusNumeros({
  numeros,
  c,
  s,
}: {
  numeros: Estadisticas | null;
  c: Colores;
  s: ReturnType<typeof estilos>;
}) {
  return (
    <>
      <Text style={s.seccion}>Tus números</Text>
      {!numeros || numeros.consultas === 0 ? (
        <Text style={s.vacio}>
          Todavía no hay suficientes datos. Se van llenando solos a medida que uses la
          app.
        </Text>
      ) : (
        <View style={s.numeros}>
          <View style={s.numero}>
            <Text style={s.numeroValor}>{numeros.consultas}</Text>
            <Text style={s.numeroEtiqueta}>paraderos mirados este mes</Text>
          </View>
          {numeros.esperaMedia !== null ? (
            <View style={s.numero}>
              <Text style={s.numeroValor}>{esperaTexto(numeros.esperaMedia)}</Text>
              <Text style={s.numeroEtiqueta}>de espera promedio</Text>
            </View>
          ) : null}
          {numeros.paraderoHabitual ? (
            <View style={s.numero}>
              <Text style={s.numeroValorChico} numberOfLines={2}>
                {numeros.paraderoHabitual}
              </Text>
              <Text style={s.numeroEtiqueta}>tu paradero de siempre</Text>
            </View>
          ) : null}
          {numeros.recorridoHabitual ? (
            <View style={s.numero}>
              <Text style={s.numeroValor}>{numeros.recorridoHabitual}</Text>
              <Text style={s.numeroEtiqueta}>tu recorrido de siempre</Text>
            </View>
          ) : null}
        </View>
      )}
    </>
  );
}

function Bloqueadas({ s }: { s: ReturnType<typeof estilos> }) {
  return (
    <View style={s.bloqueadas}>
      <Text style={s.bloqueadasTitulo}>Todavía no disponibles</Text>
      <Text style={s.bloqueadasCuerpo}>
        El widget en la pantalla de inicio, el Apple Watch y la Live Activity necesitan
        las cuentas de desarrollador de Apple y Google, que aún no existen. La lógica ya
        está construida y esperándolas.
      </Text>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: esp.lg, paddingBottom: esp.xxl },

    titulo: { ...tipo.titulo, color: c.texto },
    bajada: {
      ...tipo.cuerpo,
      color: c.textoSuave,
      marginTop: 6,
      marginBottom: esp.lg,
      lineHeight: 21,
    },

    seccion: {
      ...tipo.micro,
      color: c.textoTenue,
      textTransform: "uppercase",
      marginTop: esp.xl,
      marginBottom: esp.sm,
    },

    tarjetaPlan: {
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
    },
    planTitulo: { ...tipo.cuerpoFuerte, color: c.texto, marginBottom: esp.sm },
    planLinea: { ...tipo.menor, color: c.textoSuave, lineHeight: 22 },

    funcion: {
      flexDirection: "row",
      gap: esp.md,
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
      marginBottom: esp.sm,
    },
    funcionIcono: {
      fontSize: 16,
      color: c.textoTenue,
      width: 22,
      textAlign: "center",
      marginTop: 1,
    },
    funcionIconoActiva: { color: c.marca },
    funcionMedio: { flex: 1, minWidth: 0 },
    funcionTitulo: { ...tipo.cuerpoFuerte, color: c.texto },
    funcionCuerpo: {
      ...tipo.menor,
      color: c.textoSuave,
      marginTop: 3,
      lineHeight: 19,
    },

    precio: {
      backgroundColor: c.marcaSuave,
      borderRadius: radio.md,
      padding: esp.lg,
      marginTop: esp.lg,
    },
    precioMonto: { ...tipo.subtitulo, color: c.marcaTexto },
    precioNota: {
      ...tipo.menor,
      color: c.marcaTexto,
      marginTop: 5,
      lineHeight: 19,
      opacity: 0.9,
    },

    rutina: {
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
      marginBottom: esp.sm,
    },
    rutinaCabecera: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    hora: { ...tipo.titulo, color: c.texto },
    borrar: { fontSize: 17, color: c.textoTenue },
    paradero: { ...tipo.cuerpoFuerte, color: c.texto, marginTop: 2 },
    detalle: { ...tipo.menor, color: c.textoTenue, marginTop: 2 },

    numeros: { flexDirection: "row", flexWrap: "wrap", gap: esp.sm },
    numero: {
      flexGrow: 1,
      flexBasis: "45%",
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
    },
    numeroValor: { ...tipo.titulo, color: c.marca },
    numeroValorChico: { ...tipo.cuerpoFuerte, color: c.marca, lineHeight: 20 },
    numeroEtiqueta: { ...tipo.menor, color: c.textoTenue, marginTop: 3, lineHeight: 17 },

    boton: {
      backgroundColor: c.marca,
      borderRadius: radio.md,
      paddingVertical: esp.md,
      alignItems: "center",
      marginTop: esp.sm,
    },
    botonTexto: { ...tipo.cuerpoFuerte, color: c.textoInverso },

    vacio: {
      ...tipo.menor,
      color: c.textoTenue,
      lineHeight: 20,
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
    },

    bloqueadas: {
      backgroundColor: c.neutroFondo,
      borderRadius: radio.md,
      padding: esp.lg,
      marginTop: esp.lg,
    },
    bloqueadasTitulo: { ...tipo.cuerpoFuerte, color: c.textoSuave },
    bloqueadasCuerpo: {
      ...tipo.menor,
      color: c.textoTenue,
      marginTop: 4,
      lineHeight: 19,
    },

    pruebas: {
      marginTop: esp.xl,
      borderTopWidth: 1,
      borderTopColor: c.bordeSuave,
      paddingTop: esp.lg,
    },
    pruebasFila: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pruebasTexto: { ...tipo.cuerpo, color: c.textoSuave },
    pruebasNota: {
      ...tipo.menor,
      color: c.textoTenue,
      marginTop: esp.sm,
      lineHeight: 18,
    },
    pruebasFuerte: { fontWeight: "700", color: c.textoSuave },
  });
