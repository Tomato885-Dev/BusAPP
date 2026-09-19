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

import { Vacio } from "../../src/componentes/Vacio";
import { duracionTexto } from "../../src/formato";
import { planificar, type Viaje } from "../../src/planificador";
import { buscarLugares, type Paradero } from "../../src/red";
import { esp, radio, tipo, useColores, type Colores } from "../../src/tema";

type Punto = { nombre: string; lat: number; lon: number };

export default function PantallaLlegar() {
  const c = useColores();
  const insets = useSafeAreaInsets();
  const s = estilos(c);

  const [origen, setOrigen] = useState<Punto | null>(null);
  const [destino, setDestino] = useState<Punto | null>(null);
  const [campo, setCampo] = useState<"origen" | "destino" | null>(null);
  const [texto, setTexto] = useState("");

  const sugerencias = useMemo(() => (campo ? buscarLugares(texto) : []), [campo, texto]);

  const viajes = useMemo(
    () => (origen && destino ? planificar(origen, destino) : []),
    [origen, destino],
  );

  const elegir = useCallback(
    (p: Paradero) => {
      const punto = { nombre: p.nombre, lat: p.lat, lon: p.lon };
      if (campo === "origen") setOrigen(punto);
      else setDestino(punto);
      setCampo(null);
      setTexto("");
    },
    [campo],
  );

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
            sugerencias.map((p) => (
              <Pressable key={p.id} style={s.sugerencia} onPress={() => elegir(p)}>
                <Text style={s.sugerenciaNombre} numberOfLines={1}>
                  {p.nombre}
                </Text>
                <Text style={s.sugerenciaCodigo}>{p.codigo}</Text>
              </Pressable>
            ))
          ) : texto.length >= 2 ? (
            <Vacio
              titulo="Sin resultados"
              detalle="Prueba con el nombre de una calle, un hito o un paradero cercano."
            />
          ) : (
            <Vacio
              titulo="Escribe para buscar"
              detalle="Puedes buscar por nombre de paradero, estación de Metro o punto conocido."
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
  return (
    <Pressable
      style={s.viaje}
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
        <Text style={s.viajeTotal}>{duracionTexto(viaje.segundosTotales)}</Text>
      </View>

      <View style={s.pasos}>
        <Paso
          punto="caminar"
          principal={`Camina ${viaje.caminataInicialM} m`}
          secundario={`hasta ${viaje.subirEn.nombre}`}
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
          secundario={`y camina ${viaje.caminataFinalM} m`}
        />
      </View>
    </Pressable>
  );
}

function Paso({
  punto,
  principal,
  secundario,
}: {
  punto: "caminar" | "micro" | "bajar";
  principal: string;
  secundario: string;
}) {
  const c = useColores();
  const s = estilos(c);
  const icono = { caminar: "⇣", micro: "▣", bajar: "⇡" }[punto];
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

    formulario: { flexDirection: "row", marginHorizontal: esp.lg, gap: esp.md },
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
    sugerenciaNombre: { ...tipo.cuerpo, color: c.texto, flex: 1 },
    sugerenciaCodigo: { ...tipo.micro, color: c.textoTenue },

    viaje: {
      backgroundColor: c.superficie,
      borderRadius: radio.md,
      padding: esp.lg,
      marginBottom: esp.md,
    },
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
