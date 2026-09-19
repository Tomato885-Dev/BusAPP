import { Pressable, StyleSheet, Text, View } from "react-native";

import { llegadasDeParadero } from "../api";
import { etaTexto, origenTexto, rangoTexto, tono } from "../formato";
import { PARADERO_POR_ID } from "../red";
import { horaTexto, type Rutina } from "../rutinas";
import { elevacion, esp, radio, tipo, useColores, type Colores } from "../tema";

/** Cuántas micros caben sin que la tarjeta tape el mapa. */
const CUANTAS = 3;

/**
 * La tarjeta de rutina: lo que después será el widget de la pantalla de inicio.
 *
 * Aparece sola cuando falta poco para la hora habitual. No hay que abrir nada
 * ni buscar nada: la información llega cuando sirve. Esa inversión —que la app
 * te busque a ti en vez de esperar a que la abras— es lo que se cobra.
 */
export function TarjetaRutina({
  rutina,
  minutosParaSalir,
  onAbrir,
}: {
  rutina: Rutina;
  minutosParaSalir: number;
  onAbrir?: () => void;
}) {
  const c = useColores();
  const s = estilos(c);

  const paradero = PARADERO_POR_ID.get(rutina.paraderoId);
  if (!paradero) return null;

  const datos = llegadasDeParadero(paradero.id);
  const atrasado = minutosParaSalir < 0;

  return (
    <Pressable style={[s.tarjeta, elevacion(c, 3)]} onPress={onAbrir}>
      <View style={s.cabecera}>
        <Text style={s.etiqueta}>TU RUTINA · {horaTexto(rutina.hora)}</Text>
        <Text style={[s.cuenta, atrasado && { color: c.aviso }]}>
          {atrasado
            ? `hace ${Math.abs(minutosParaSalir)} min`
            : minutosParaSalir === 0
              ? "ahora"
              : `en ${minutosParaSalir} min`}
        </Text>
      </View>

      <Text style={s.paradero} numberOfLines={1}>
        {paradero.nombre}
      </Text>

      {datos.aviso ? (
        <Text style={[s.alerta, { color: datos.aviso.nivel === "critico" ? c.malo : c.aviso }]}>
          {datos.aviso.titulo}
        </Text>
      ) : null}

      <View style={s.lista}>
        {datos.llegadas.slice(0, CUANTAS).map((l, i) => {
          const color = {
            ok: c.ok, aviso: c.aviso, malo: c.malo, neutro: c.neutro,
          }[tono(l.estado, l.confianza)];
          return (
            <View key={`${l.recorrido}-${i}`} style={s.fila}>
              <View style={s.insignia}>
                <Text style={s.insigniaTexto}>{l.recorrido}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.destino} numberOfLines={1}>{l.destino}</Text>
                <Text style={[s.origen, { color }]} numberOfLines={1}>
                  {origenTexto(l)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[s.eta, { color }]}>{etaTexto(l)}</Text>
                <Text style={s.rango}>{rangoTexto(l)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const estilos = (c: Colores) =>
  StyleSheet.create({
    tarjeta: {
      backgroundColor: c.superficieAlta,
      borderRadius: radio.lg,
      padding: esp.lg,
      borderWidth: 1.5,
      borderColor: c.marca,
    },
    cabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    etiqueta: { ...tipo.micro, color: c.marca },
    cuenta: { ...tipo.cuerpoFuerte, color: c.marca },
    paradero: { ...tipo.subtitulo, color: c.texto, marginTop: 2 },
    alerta: { ...tipo.menor, marginTop: esp.sm, fontWeight: "700" },
    lista: { marginTop: esp.md, gap: esp.md },
    fila: { flexDirection: "row", alignItems: "center", gap: esp.md },
    insignia: {
      minWidth: 46,
      paddingHorizontal: esp.sm,
      height: 28,
      borderRadius: radio.sm,
      backgroundColor: c.texto,
      alignItems: "center",
      justifyContent: "center",
    },
    insigniaTexto: { ...tipo.menor, fontWeight: "700", color: c.textoInverso },
    destino: { ...tipo.cuerpo, color: c.texto },
    origen: { ...tipo.menor, marginTop: 1 },
    eta: { fontSize: 22, fontWeight: "800", letterSpacing: -0.8, lineHeight: 25 },
    rango: { ...tipo.menor, color: c.textoTenue },
  });
