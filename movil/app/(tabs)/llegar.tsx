import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { llegadasDeParadero } from "../../src/api";
import { Vacio } from "../../src/componentes/Vacio";
import { duracionTexto } from "../../src/formato";
import type { Lugar } from "../../src/geocodificador";
import { planificar, type Viaje } from "../../src/planificador";
import { usePremium } from "../../src/premium";
import { esp, fuente, radio, tipo, useColores, type Colores } from "../../src/tema";
import { useBusqueda } from "../../src/useBusqueda";
import { useViaje } from "../../src/viaje";

type Punto = { nombre: string; lat: number; lon: number };

export default function PantallaLlegar() {
  const c = useColores();
  const insets = useSafeAreaInsets();
  const s = estilos(c);

  const [origen, setOrigen] = useState<Punto | null>(null);
  const [destino, setDestino] = useState<Punto | null>(null);
  const [campo, setCampo] = useState<"origen" | "destino" | null>(null);
  const [texto, setTexto] = useState("");

  const { resultados: sugerencias, buscando } = useBusqueda(campo ? texto : "");

  const viajes = useMemo(() => {
    if (!origen || !destino) return [];
    const encontrados = planificar(origen, destino);

    // Un recorrido que no está pasando no puede encabezar la lista, por muy
    // rápido que sea en el papel. Mandar a alguien a caminar seis cuadras hacia
    // una micro desviada es exactamente lo que Kupay existe para evitar, así
    // que la advertencia no basta: hay que bajarlo de posición.
    const penalidad = (v: (typeof encontrados)[number]) => {
      if (v.fueraDeHorario) return 2;
      const primero = v.tramos[0];
      const datos = llegadasDeParadero(primero.subirEn.id);
      const suyo = datos.llegadas.find((l) => l.recorrido === primero.recorrido.nombre);
      return suyo?.estado === "no_llegara" ? 1 : 0;
    };

    return encontrados
      .map((v) => ({ v, p: penalidad(v) }))
      .sort((a, b) => a.p - b.p || a.v.segundosTotales - b.v.segundosTotales)
      .map((x) => x.v);
  }, [origen, destino]);

  const elegir = useCallback(
    (l: Lugar) => {
      const punto = { nombre: l.nombre, lat: l.lat, lon: l.lon };
      if (campo === "origen") setOrigen(punto);
      else setDestino(punto);
      setCampo(null);
      setTexto("");
    },
    [campo],
  );

  const invertir = useCallback(() => {
    setOrigen(destino);
    setDestino(origen);
  }, [origen, destino]);

  const usarMiUbicacion = useCallback(async () => {
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      setOrigen({
        nombre: "Mi ubicación",
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      });
      setCampo(null);
      setTexto("");
    } catch {
      // Sin permiso, el origen se elige buscándolo como cualquier otro lugar.
    }
  }, []);

  return (
    <View style={[s.pantalla, { paddingTop: insets.top + esp.md }]}>
      <Text style={s.tituloPantalla}>Cómo llegar</Text>

      <View style={s.formulario}>
        <View style={s.rieles}>
          <View style={[s.nodo, { borderColor: c.ok }]} />
          <View style={s.riel} />
          <View style={[s.nodo, s.nodoDestino, { borderColor: c.malo }]} />
        </View>

        <View style={s.campos}>
          <Campo
            etiqueta="Desde"
            valor={origen?.nombre}
            activo={campo === "origen"}
            texto={texto}
            onActivar={() => {
              setCampo("origen");
              setTexto("");
            }}
            onTexto={setTexto}
          />
          <View style={s.separador} />
          <Campo
            etiqueta="Hasta"
            valor={destino?.nombre}
            activo={campo === "destino"}
            texto={texto}
            onActivar={() => {
              setCampo("destino");
              setTexto("");
            }}
            onTexto={setTexto}
          />
        </View>

        {origen || destino ? (
          <Pressable
            onPress={invertir}
            hitSlop={10}
            style={s.invertir}
            accessibilityRole="button"
            accessibilityLabel="Invertir origen y destino"
          >
            <Text style={s.invertirIcono}>⇅</Text>
          </Pressable>
        ) : null}
      </View>

      {campo === "origen" ? (
        <Pressable onPress={usarMiUbicacion} style={s.miUbicacion}>
          <Text style={s.miUbicacionIcono}>⌖</Text>
          <Text style={s.miUbicacionTexto}>Usar mi ubicación</Text>
        </Pressable>
      ) : null}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.lista}>
        {campo ? (
          sugerencias.length > 0 ? (
            sugerencias.map((l) => (
              <Pressable key={l.id} style={s.sugerencia} onPress={() => elegir(l)}>
                <Text style={s.sugerenciaIcono}>{l.tipo === "direccion" ? "⌂" : "◉"}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.sugerenciaNombre} numberOfLines={1}>
                    {l.nombre}
                  </Text>
                  {l.detalle ? (
                    <Text style={s.sugerenciaDetalle} numberOfLines={1}>
                      {l.detalle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))
          ) : buscando ? (
            <Vacio titulo="Buscando…" />
          ) : texto.trim().length >= 3 ? (
            <Vacio
              titulo="Sin resultados"
              detalle="Prueba escribiendo la calle y el número, o el nombre de un lugar conocido."
            />
          ) : (
            <Vacio
              titulo="Escribe una dirección"
              detalle="Por ejemplo «Av. Providencia 1234» o «Alameda 340». También puedes buscar un paradero o una estación de Metro."
            />
          )
        ) : !origen || !destino ? (
          <Vacio
            titulo="Elige origen y destino"
            detalle="Te mostramos qué micro tomar, dónde subir y dónde bajar."
          />
        ) : viajes.length === 0 ? (
          <Vacio
            titulo="No encontramos cómo llegar"
            detalle="Ni directo ni con una combinación. Prueba con un punto de partida algo más cercano a una avenida."
          />
        ) : (
          <>
            <Text style={s.encabezadoLista}>
              {viajes.length} {viajes.length === 1 ? "opción" : "opciones"}
              {viajes.some((v) => v.tramos.length > 1) ? " · incluye combinaciones" : ""}
            </Text>
            {viajes.map((v, i) => (
              <TarjetaViaje key={v.tramos.map((t) => t.recorrido.id).join(">") + i} viaje={v} />
            ))}
            <Text style={s.nota}>
              Tiempos estimados con la frecuencia oficial de cada recorrido. Con el
              servidor en pie se ajustan con la posición real de cada micro.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Campo({
  etiqueta,
  valor,
  activo,
  texto,
  onActivar,
  onTexto,
}: {
  etiqueta: string;
  valor?: string;
  activo: boolean;
  texto: string;
  onActivar: () => void;
  onTexto: (t: string) => void;
}) {
  const c = useColores();
  const s = estilos(c);

  if (activo) {
    return (
      <View style={s.campo}>
        <Text style={s.campoEtiqueta}>{etiqueta}</Text>
        <TextInput
          value={texto}
          onChangeText={onTexto}
          placeholder="Buscar…"
          placeholderTextColor={c.textoTenue}
          style={s.campoEntrada}
          autoFocus
          returnKeyType="search"
        />
      </View>
    );
  }

  return (
    <Pressable style={s.campo} onPress={onActivar} accessibilityRole="button">
      <Text style={s.campoEtiqueta}>{etiqueta}</Text>
      <Text style={[s.campoValor, !valor && { color: c.textoTenue }]} numberOfLines={1}>
        {valor ?? "Elegir lugar"}
      </Text>
    </Pressable>
  );
}

function TarjetaViaje({ viaje }: { viaje: Viaje }) {
  const c = useColores();
  const s = estilos(c);
  const { esPremium } = usePremium();
  const { iniciar } = useViaje();

  const primero = viaje.tramos[0];

  // Lo que distingue a Kupay de cualquier otro planificador: antes de mandar a
  // alguien a caminar seis cuadras, se comprueba que esa micro esté pasando.
  const estadoPrimero = useMemo(() => {
    const datos = llegadasDeParadero(primero.subirEn.id);
    return datos.llegadas.find((l) => l.recorrido === primero.recorrido.nombre) ?? null;
  }, [primero.subirEn.id, primero.recorrido.nombre]);

  const noPasa = estadoPrimero?.estado === "no_llegara";
  const dudoso =
    estadoPrimero?.estado === "probable_desvio" || estadoPrimero?.estado === "discrepancia";

  const comenzarViaje = async () => {
    const r = primero.recorrido;
    const desde = r.paradas.indexOf(primero.subirEn.id);
    const hasta = r.paradas.indexOf(primero.bajarEn.id, desde + 1);
    if (desde < 0 || hasta < 0) return;
    await iniciar({ recorridoId: r.id, desde, hasta, avisoParadas: 2 });
  };

  return (
    <View style={[s.viaje, viaje.fueraDeHorario && s.viajeApagado]}>
      <Pressable
        onPress={() =>
          router.push({ pathname: "/paradero/[id]", params: { id: primero.subirEn.id } })
        }
      >
        <View style={s.viajeCabecera}>
          <View style={s.cadena}>
            {viaje.tramos.map((tr, i) => (
              <View key={tr.recorrido.id + i} style={s.cadenaItem}>
                {i > 0 ? <Text style={s.cadenaFlecha}>›</Text> : null}
                <View style={s.viajeInsignia}>
                  <Text style={s.viajeInsigniaTexto} numberOfLines={1}>
                    {tr.recorrido.nombre}
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <Text style={s.viajeTotal}>
            {viaje.fueraDeHorario ? "—" : duracionTexto(viaje.segundosTotales)}
          </Text>
        </View>

        {noPasa ? (
          <Text style={[s.estado, { color: c.malo }]}>
            ✕ Esta micro no está pasando por ese paradero
          </Text>
        ) : dudoso ? (
          <Text style={[s.estado, { color: c.aviso }]}>
            ! Podría demorar más de lo que dice el horario
          </Text>
        ) : null}

        <View style={s.linea}>
          <Hito
            tipo="pie"
            titulo={
              viaje.caminataInicialM < 50
                ? "Ya estás en el paradero"
                : `Camina ${viaje.caminataInicialM} m`
            }
            detalle={primero.subirEn.nombre}
          />
          {viaje.tramos.map((tr, i) => (
            <View key={tr.recorrido.id + "t" + i}>
              <Hito
                tipo="micro"
                titulo={`Toma la ${tr.recorrido.nombre}`}
                detalle={
                  tr.segundosEsperando === null
                    ? "fuera de horario a esta hora"
                    : `espera ~${Math.round(tr.segundosEsperando / 60)} min · pasa cada ${Math.round(
                        (tr.intervaloS ?? 0) / 60,
                      )} min`
                }
                trazo
              />
              <Hito
                tipo="paradas"
                titulo={`${tr.paradas} ${tr.paradas === 1 ? "parada" : "paradas"} · ${duracionTexto(
                  tr.segundosEnMicro,
                )}`}
                detalle={`hacia ${tr.recorrido.destino}`}
                trazo
                tenue
              />
              {i < viaje.tramos.length - 1 ? (
                <Hito
                  tipo="cambio"
                  titulo={`Cámbiate en ${tr.bajarEn.nombre}`}
                  detalle={
                    viaje.caminataTransbordoM < 50
                      ? "en el mismo paradero"
                      : `caminando ${viaje.caminataTransbordoM} m`
                  }
                />
              ) : null}
            </View>
          ))}
          <Hito
            tipo="fin"
            titulo={`Bájate en ${viaje.tramos[viaje.tramos.length - 1].bajarEn.nombre}`}
            detalle={
              viaje.caminataFinalM < 50 ? "y llegaste" : `y camina ${viaje.caminataFinalM} m`
            }
            ultimo
          />
        </View>
      </Pressable>

      {!viaje.fueraDeHorario ? (
        <Pressable
          style={s.comenzar}
          onPress={() => (esPremium ? comenzarViaje() : router.push("/rutina"))}
          accessibilityRole="button"
        >
          <Text style={s.comenzarTexto}>
            {esPremium
              ? "Ya me subí · avísame antes de bajarme"
              : "Avísame antes de bajarme"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Un punto del itinerario.
 *
 * La línea vertical que los une es lo que convierte una lista de instrucciones
 * en un recorrido: se ve de un vistazo cuánto del viaje es caminar y cuánto es
 * ir arriba de la micro.
 */
function Hito({
  tipo,
  titulo,
  detalle,
  trazo,
  tenue,
  ultimo,
}: {
  tipo: "pie" | "micro" | "paradas" | "cambio" | "fin";
  titulo: string;
  detalle: string;
  /** El tramo hasta el siguiente hito va arriba de la micro. */
  trazo?: boolean;
  tenue?: boolean;
  ultimo?: boolean;
}) {
  const c = useColores();
  const s = estilos(c);
  const color = tipo === "cambio" ? c.aviso : tipo === "fin" ? c.malo : c.marca;

  return (
    <View style={s.hito}>
      <View style={s.hitoRiel}>
        {tipo === "paradas" ? (
          <View style={[s.hitoPunto, s.hitoPuntoChico, { backgroundColor: color }]} />
        ) : (
          <View style={[s.hitoPunto, { borderColor: color }]} />
        )}
        {!ultimo ? (
          <View
            style={[
              s.hitoTrazo,
              trazo ? { backgroundColor: color, width: 3 } : { backgroundColor: c.borde },
            ]}
          />
        ) : null}
      </View>
      <View style={s.hitoTexto}>
        <Text style={[s.hitoTitulo, tenue && { color: c.textoSuave }]} numberOfLines={2}>
          {titulo}
        </Text>
        <Text style={s.hitoDetalle} numberOfLines={2}>
          {detalle}
        </Text>
      </View>
    </View>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: c.fondo },
    tituloPantalla: { ...tipo.titulo, color: c.texto, paddingHorizontal: esp.lg, marginBottom: esp.md },

    formulario: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: esp.lg,
      gap: esp.md,
    },
    invertir: {
      width: 38,
      height: 38,
      borderRadius: radio.pastilla,
      backgroundColor: c.superficie,
      alignItems: "center",
      justifyContent: "center",
    },
    invertirIcono: { fontSize: 18, color: c.marca },
    rieles: { alignItems: "center", paddingVertical: esp.lg },
    nodo: { width: 11, height: 11, borderRadius: 6, borderWidth: 2.5 },
    nodoDestino: { borderRadius: 2 },
    riel: { flex: 1, width: 2, backgroundColor: c.borde, marginVertical: 4 },
    campos: { flex: 1, backgroundColor: c.superficie, borderRadius: radio.md },
    separador: { height: StyleSheet.hairlineWidth, backgroundColor: c.bordeSuave, marginLeft: esp.lg },
    campo: { paddingHorizontal: esp.lg, paddingVertical: esp.md, minHeight: 58, justifyContent: "center" },
    campoEtiqueta: { ...tipo.micro, color: c.textoTenue, marginBottom: 2 },
    campoValor: { ...tipo.cuerpo, color: c.texto },
    campoEntrada: { ...tipo.cuerpo, color: c.texto, padding: 0, margin: 0 },

    miUbicacion: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.sm,
      marginHorizontal: esp.lg,
      marginTop: esp.md,
      paddingVertical: esp.md,
      paddingHorizontal: esp.lg,
      backgroundColor: c.marcaSuave,
      borderRadius: radio.md,
    },
    miUbicacionIcono: { fontSize: 17, color: c.marcaTexto },
    miUbicacionTexto: { ...tipo.cuerpoFuerte, color: c.marcaTexto },

    lista: { padding: esp.lg, paddingBottom: esp.xxl },
    encabezadoLista: { ...tipo.menor, color: c.textoSuave, marginBottom: esp.md },

    sugerencia: {
      flexDirection: "row",
      alignItems: "center",
      gap: esp.md,
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      paddingHorizontal: esp.lg,
      paddingVertical: esp.md,
      marginBottom: esp.sm,
    },
    sugerenciaIcono: { fontSize: 15, color: c.textoTenue, width: 18, textAlign: "center" },
    sugerenciaNombre: { ...tipo.cuerpo, color: c.texto },
    sugerenciaDetalle: { ...tipo.menor, color: c.textoTenue, marginTop: 1 },

    viaje: {
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
      marginBottom: esp.md,
    },
    viajeApagado: { opacity: 0.6 },
    estado: { ...tipo.menor, fontFamily: fuente.fuerte, marginTop: esp.sm },
    comenzar: {
      marginTop: esp.md,
      paddingVertical: esp.sm,
      borderRadius: radio.pastilla,
      backgroundColor: c.marcaSuave,
      alignItems: "center",
    },
    comenzarTexto: { ...tipo.menor, fontFamily: fuente.fuerte, color: c.marcaTexto },
    viajeCabecera: { flexDirection: "row", alignItems: "center", gap: esp.md },
    viajeInsignia: {
      minWidth: 52,
      paddingHorizontal: esp.sm,
      height: 30,
      borderRadius: radio.sm,
      backgroundColor: c.texto,
      alignItems: "center",
      justifyContent: "center",
    },
    viajeInsigniaTexto: { ...tipo.cuerpoFuerte, color: c.textoInverso },
    cadena: { flexDirection: "row", alignItems: "center", flexShrink: 1, flexWrap: "wrap" },
    cadenaItem: { flexDirection: "row", alignItems: "center" },
    cadenaFlecha: { ...tipo.subtitulo, color: c.textoTenue, marginHorizontal: 5 },
    viajeTotal: { ...tipo.subtitulo, color: c.texto },

    linea: { marginTop: esp.lg },
    hito: { flexDirection: "row", gap: esp.md },
    hitoRiel: { width: 14, alignItems: "center" },
    hitoPunto: {
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2.5,
      backgroundColor: c.superficie,
      marginTop: 3,
    },
    hitoPuntoChico: { width: 6, height: 6, borderRadius: 3, borderWidth: 0, marginTop: 6 },
    hitoTrazo: { flex: 1, width: 2, borderRadius: 2, marginVertical: 3 },
    hitoTexto: { flex: 1, minWidth: 0, paddingBottom: esp.md },
    hitoTitulo: { ...tipo.cuerpo, color: c.texto },
    hitoDetalle: { ...tipo.menor, color: c.textoTenue, marginTop: 1, lineHeight: 17 },

    nota: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      marginTop: esp.lg,
      lineHeight: 18,
      paddingHorizontal: esp.md,
    },
  });
