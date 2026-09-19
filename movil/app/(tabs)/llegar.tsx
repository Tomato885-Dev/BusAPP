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
      const datos = llegadasDeParadero(v.subirEn.id);
      const suyo = datos.llegadas.find((l) => l.recorrido === v.recorrido.nombre);
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
            titulo="No encontramos un viaje directo"
            detalle="Por ahora sólo buscamos recorridos sin transbordo. Las combinaciones llegan cuando esté el servidor."
          />
        ) : (
          <>
            <Text style={s.encabezadoLista}>
              {viajes.length} {viajes.length === 1 ? "opción" : "opciones"} sin transbordo
            </Text>
            {viajes.map((v) => (
              <TarjetaViaje key={v.recorrido.id} viaje={v} />
            ))}
            <Text style={s.nota}>
              Tiempos estimados con la velocidad habitual del recorrido. Con el servidor
              en pie se ajustan con la posición real de cada micro.
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

  // Lo que distingue a Kupay de cualquier otro planificador: antes de mandar a
  // alguien a caminar seis cuadras, se comprueba que esa micro esté pasando.
  const estadoEnParadero = useMemo(() => {
    const datos = llegadasDeParadero(viaje.subirEn.id);
    return datos.llegadas.find((l) => l.recorrido === viaje.recorrido.nombre) ?? null;
  }, [viaje.subirEn.id, viaje.recorrido.nombre]);

  const noPasa = estadoEnParadero?.estado === "no_llegara";
  const dudoso = estadoEnParadero?.estado === "probable_desvio" ||
    estadoEnParadero?.estado === "discrepancia";

  const comenzarViaje = async () => {
    const desde = viaje.recorrido.paradas.indexOf(viaje.subirEn.id);
    const hasta = viaje.recorrido.paradas.indexOf(viaje.bajarEn.id, desde + 1);
    if (desde < 0 || hasta < 0) return;
    await iniciar({ recorridoId: viaje.recorrido.id, desde, hasta, avisoParadas: 2 });
  };

  return (
    <View style={[s.viaje, viaje.fueraDeHorario && s.viajeApagado]}>
      <Pressable
        onPress={() =>
          router.push({ pathname: "/paradero/[id]", params: { id: viaje.subirEn.id } })
        }
      >
        <View style={s.viajeCabecera}>
          <View style={s.viajeInsignia}>
            <Text style={s.viajeInsigniaTexto}>{viaje.recorrido.nombre}</Text>
          </View>
          <Text style={s.viajeDestino} numberOfLines={1}>
            {viaje.recorrido.destino}
          </Text>
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

        <View style={s.pasos}>
          <Paso
            punto="caminar"
            principal={
              viaje.caminataInicialM < 50
                ? "Ya estás en el paradero"
                : `Camina ${viaje.caminataInicialM} m`
            }
            secundario={
              viaje.caminataInicialM < 50
                ? viaje.subirEn.nombre
                : `hasta ${viaje.subirEn.nombre}`
            }
          />
          <Paso
            punto="esperar"
            principal={
              viaje.fueraDeHorario
                ? "Fuera de horario"
                : `Espera ~${Math.round((viaje.segundosEsperando ?? 0) / 60)} min`
            }
            secundario={
              viaje.fueraDeHorario
                ? "este recorrido no opera a esta hora"
                : `pasa cada ${Math.round((viaje.intervaloS ?? 0) / 60)} min`
            }
          />
          <Paso
            punto="micro"
            principal={`Toma la ${viaje.recorrido.nombre}`}
            secundario={`${viaje.paradasIntermedias} ${
              viaje.paradasIntermedias === 1 ? "parada" : "paradas"
            } · ${duracionTexto(viaje.segundosEnMicro)}`}
          />
          <Paso
            punto="bajar"
            principal={`Bájate en ${viaje.bajarEn.nombre}`}
            secundario={
              viaje.caminataFinalM < 50
                ? "y llegaste"
                : `y camina ${viaje.caminataFinalM} m`
            }
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
            {esPremium ? "Ya me subí · avísame antes de bajarme" : "Avísame antes de bajarme"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Paso({
  punto,
  principal,
  secundario,
}: {
  punto: "caminar" | "esperar" | "micro" | "bajar";
  principal: string;
  secundario: string;
}) {
  const c = useColores();
  const s = estilos(c);
  const icono = { caminar: "⇣", esperar: "◷", micro: "▣", bajar: "⇡" }[punto];
  return (
    <View style={s.paso}>
      <Text style={s.pasoIcono}>{icono}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.pasoPrincipal} numberOfLines={1}>
          {principal}
        </Text>
        <Text style={s.pasoSecundario} numberOfLines={1}>
          {secundario}
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
    viajeDestino: { ...tipo.cuerpo, color: c.textoSuave, flex: 1 },
    viajeTotal: { ...tipo.subtitulo, color: c.texto },

    pasos: { marginTop: esp.lg, gap: esp.md },
    paso: { flexDirection: "row", alignItems: "flex-start", gap: esp.md },
    pasoIcono: { fontSize: 14, color: c.marca, width: 18, textAlign: "center", lineHeight: 19 },
    pasoPrincipal: { ...tipo.cuerpo, color: c.texto },
    pasoSecundario: { ...tipo.menor, color: c.textoTenue, marginTop: 1 },

    nota: {
      ...tipo.menor,
      color: c.textoTenue,
      textAlign: "center",
      marginTop: esp.lg,
      lineHeight: 18,
      paddingHorizontal: esp.md,
    },
  });
