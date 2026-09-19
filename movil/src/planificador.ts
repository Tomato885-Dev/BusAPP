/**
 * Planificación de viajes.
 *
 * Resuelve **viajes directos y con un transbordo**. Dos transbordos quedan
 * fuera a propósito: en una red del tamaño de Santiago el costo de buscarlos
 * crece muchísimo, y un viaje con dos combinaciones dentro de la ciudad casi
 * siempre significa que el planificador no encontró la buena.
 *
 * La decisión de `docs/03-arquitectura.md` §3.5 sigue en pie: el planificador
 * definitivo será OpenTripPlanner en el servidor. Esto resuelve sin servidor lo
 * que cubre la enorme mayoría de los viajes reales.
 *
 * ## Cómo busca
 *
 * 1. Desde el origen, con **un** bus: a qué paraderos se puede llegar y a qué
 *    costo. Es el «alcance de ida».
 * 2. Hacia el destino, con **un** bus: desde qué paraderos se puede llegar. Es
 *    el «alcance de vuelta», calculado hacia atrás.
 * 3. Donde los dos alcances se tocan hay un transbordo posible.
 *
 * Buscar desde los dos extremos a la vez es lo que hace esto barato: en vez de
 * probar todas las combinaciones de par de recorridos, se comparan dos
 * conjuntos ya construidos.
 */

import { distanciaM } from "./mapa/proyeccion";
import {
  PARADEROS,
  PARADERO_POR_ID,
  indicePorParadero,
  intervaloOficial,
  largoDeTramo,
  type Paradero,
  type Recorrido,
} from "./red";

/** Velocidad comercial de una micro en Santiago, incluyendo detenciones. */
const VELOCIDAD_MS = 16 / 3.6;
/** Velocidad de caminata. */
const CAMINATA_MS = 4.6 / 3.6;
/** Radio en que se considera que un paradero «sirve» a un punto. */
const RADIO_M = 650;
/** Cuánto se acepta caminar entre el paradero donde uno se baja y el siguiente. */
const RADIO_TRANSBORDO_M = 320;
/**
 * Castigo por transbordar, en segundos.
 *
 * No es tiempo real: es lo que cuesta *psicológicamente* bajarse, cruzar y
 * volver a esperar sin saber si viene. Sin esto el planificador ofrece
 * combinaciones que ahorran dos minutos en el papel y que nadie elegiría.
 */
const CASTIGO_TRANSBORDO_S = 240;

export interface Tramo {
  recorrido: Recorrido;
  subirEn: Paradero;
  bajarEn: Paradero;
  paradas: number;
  segundosEnMicro: number;
  /** Espera esperada. `null` si el recorrido no opera ahora. */
  segundosEsperando: number | null;
  intervaloS: number | null;
}

export interface Viaje {
  /** Uno o dos. El segundo existe sólo si hay transbordo. */
  tramos: Tramo[];
  caminataInicialM: number;
  /** Metros a pie entre bajarse del primer bus y tomar el segundo. */
  caminataTransbordoM: number;
  caminataFinalM: number;
  segundosCaminando: number;
  segundosTotales: number;
  fueraDeHorario: boolean;
}

// ---------------------------------------------------------------------------
// Índice espacial
//
// Buscar el paradero más cercano recorriendo los 3.748 no se nota una vez,
// pero el buscador de transbordos lo haría miles de veces. Una rejilla de
// celdas lo convierte en mirar nueve casilleros.
// ---------------------------------------------------------------------------

/** Lado de la celda en grados. ~0,003° son unos 300 m en Santiago. */
const CELDA = 0.003;

const clave = (lat: number, lon: number) =>
  `${Math.floor(lat / CELDA)}:${Math.floor(lon / CELDA)}`;

const rejilla = new Map<string, Paradero[]>();
for (const p of PARADEROS) {
  const k = clave(p.lat, p.lon);
  const lista = rejilla.get(k);
  if (lista) lista.push(p);
  else rejilla.set(k, [p]);
}

function cercanos(punto: { lat: number; lon: number }, radioM: number): Paradero[] {
  // Cuántas celdas hay que mirar a cada lado para cubrir el radio pedido.
  const pasos = Math.max(1, Math.ceil(radioM / 111_000 / CELDA));
  const fila = Math.floor(punto.lat / CELDA);
  const col = Math.floor(punto.lon / CELDA);
  const salida: Paradero[] = [];
  for (let i = -pasos; i <= pasos; i++) {
    for (let j = -pasos; j <= pasos; j++) {
      for (const p of rejilla.get(`${fila + i}:${col + j}`) ?? []) {
        if (distanciaM(punto, p) <= radioM) salida.push(p);
      }
    }
  }
  return salida;
}

function paraderosCerca(punto: { lat: number; lon: number }): Map<string, number> {
  const cerca = new Map<string, number>();
  for (const p of cercanos(punto, RADIO_M)) cerca.set(p.id, distanciaM(punto, p));
  return cerca;
}

// ---------------------------------------------------------------------------
// Alcance con un bus
// ---------------------------------------------------------------------------

interface Alcance {
  tramo: Tramo;
  /** Costo acumulado en segundos, incluyendo la caminata de ese extremo. */
  costo: number;
  caminataM: number;
}

function tramoEntre(
  recorrido: Recorrido,
  desde: number,
  hasta: number,
  ahora: Date,
): Tramo {
  const intervaloS = intervaloOficial(recorrido, ahora);
  return {
    recorrido,
    subirEn: PARADERO_POR_ID.get(recorrido.paradas[desde])!,
    bajarEn: PARADERO_POR_ID.get(recorrido.paradas[hasta])!,
    paradas: hasta - desde,
    segundosEnMicro: Math.round(largoDeTramo(recorrido, desde, hasta) / VELOCIDAD_MS),
    // La espera es la mitad del intervalo: si los buses pasan cada 12 minutos y
    // uno llega al paradero en un momento cualquiera, espera 6.
    segundosEsperando: intervaloS === null ? null : Math.round(intervaloS / 2),
    intervaloS,
  };
}

/** A qué paraderos se llega desde el origen con un solo bus, y a qué costo. */
function alcanceDeIda(cerca: Map<string, number>, ahora: Date): Map<string, Alcance> {
  const mejor = new Map<string, Alcance>();
  for (const [paraderoId, caminataM] of cerca) {
    const costoPie = caminataM / CAMINATA_MS;
    for (const { recorrido, orden } of indicePorParadero.get(paraderoId) ?? []) {
      for (let i = orden + 1; i < recorrido.paradas.length; i++) {
        if (!PARADERO_POR_ID.has(recorrido.paradas[i])) continue;
        const tramo = tramoEntre(recorrido, orden, i, ahora);
        if (tramo.segundosEsperando === null) continue; // no opera ahora
        const costo = costoPie + tramo.segundosEsperando + tramo.segundosEnMicro;
        const previo = mejor.get(recorrido.paradas[i]);
        if (!previo || costo < previo.costo) {
          mejor.set(recorrido.paradas[i], { tramo, costo, caminataM });
        }
      }
    }
  }
  return mejor;
}

/** Desde qué paraderos se llega al destino con un solo bus, y a qué costo. */
function alcanceDeVuelta(cerca: Map<string, number>, ahora: Date): Map<string, Alcance> {
  const mejor = new Map<string, Alcance>();
  for (const [paraderoId, caminataM] of cerca) {
    const costoPie = caminataM / CAMINATA_MS;
    for (const { recorrido, orden } of indicePorParadero.get(paraderoId) ?? []) {
      for (let i = 0; i < orden; i++) {
        if (!PARADERO_POR_ID.has(recorrido.paradas[i])) continue;
        const tramo = tramoEntre(recorrido, i, orden, ahora);
        if (tramo.segundosEsperando === null) continue;
        const costo = costoPie + tramo.segundosEsperando + tramo.segundosEnMicro;
        const previo = mejor.get(recorrido.paradas[i]);
        if (!previo || costo < previo.costo) {
          mejor.set(recorrido.paradas[i], { tramo, costo, caminataM });
        }
      }
    }
  }
  return mejor;
}

// ---------------------------------------------------------------------------

function arma(
  tramos: Tramo[],
  caminataInicialM: number,
  caminataTransbordoM: number,
  caminataFinalM: number,
): Viaje {
  const metros = caminataInicialM + caminataTransbordoM + caminataFinalM;
  const segundosCaminando = Math.round(metros / CAMINATA_MS);
  const fueraDeHorario = tramos.some((t) => t.segundosEsperando === null);
  const enMicro = tramos.reduce((s, t) => s + t.segundosEnMicro, 0);
  const esperando = tramos.reduce((s, t) => s + (t.segundosEsperando ?? 0), 0);
  return {
    tramos,
    caminataInicialM: Math.round(caminataInicialM),
    caminataTransbordoM: Math.round(caminataTransbordoM),
    caminataFinalM: Math.round(caminataFinalM),
    segundosCaminando,
    segundosTotales: segundosCaminando + enMicro + esperando,
    fueraDeHorario,
  };
}

export function planificar(
  origen: { lat: number; lon: number },
  destino: { lat: number; lon: number },
  limite = 6,
  ahora = new Date(),
): Viaje[] {
  const cercaOrigen = paraderosCerca(origen);
  const cercaDestino = paraderosCerca(destino);
  if (cercaOrigen.size === 0 || cercaDestino.size === 0) return [];

  // --- directos -----------------------------------------------------------
  const directos = new Map<string, Viaje>();
  for (const [paraderoId, caminataInicialM] of cercaOrigen) {
    for (const { recorrido, orden } of indicePorParadero.get(paraderoId) ?? []) {
      for (let i = orden + 1; i < recorrido.paradas.length; i++) {
        const caminataFinalM = cercaDestino.get(recorrido.paradas[i]);
        if (caminataFinalM === undefined) continue;
        if (!PARADERO_POR_ID.has(recorrido.paradas[i])) continue;

        const viaje = arma(
          [tramoEntre(recorrido, orden, i, ahora)],
          caminataInicialM,
          0,
          caminataFinalM,
        );
        const previo = directos.get(recorrido.id);
        if (!previo || viaje.segundosTotales < previo.segundosTotales) {
          directos.set(recorrido.id, viaje);
        }
      }
    }
  }

  // --- con un transbordo --------------------------------------------------
  const ida = alcanceDeIda(cercaOrigen, ahora);
  const vuelta = alcanceDeVuelta(cercaDestino, ahora);

  const combinados = new Map<string, Viaje>();
  for (const [paraderoId, a] of ida) {
    const bajada = PARADERO_POR_ID.get(paraderoId);
    if (!bajada) continue;

    // El transbordo puede ser en el mismo paradero o en uno a pocos metros
    // —cruzar la calle, casi siempre—, así que se miran los dos casos.
    for (const candidato of cercanos(bajada, RADIO_TRANSBORDO_M)) {
      const b = vuelta.get(candidato.id);
      if (!b) continue;
      // Transbordar a la misma línea no es un viaje, es bajarse por gusto.
      if (b.tramo.recorrido.id === a.tramo.recorrido.id) continue;

      const caminataTransbordoM = distanciaM(bajada, candidato);
      const viaje = arma(
        [a.tramo, b.tramo],
        a.caminataM,
        caminataTransbordoM,
        b.caminataM,
      );
      const llave = `${a.tramo.recorrido.id}>${b.tramo.recorrido.id}`;
      const previo = combinados.get(llave);
      if (!previo || viaje.segundosTotales < previo.segundosTotales) {
        combinados.set(llave, viaje);
      }
    }
  }

  // El castigo por transbordar se aplica sólo al ordenar, no al tiempo que se
  // muestra: el usuario tiene que ver el tiempo real, no el ajustado.
  const peso = (v: Viaje) =>
    v.segundosTotales + (v.tramos.length > 1 ? CASTIGO_TRANSBORDO_S : 0);

  const todos = [...directos.values(), ...combinados.values()];

  // Si hay directos razonables, las combinaciones son ruido. Se dejan sólo
  // cuando aportan de verdad: no hay directo, o son claramente más rápidas.
  const mejorDirecto = [...directos.values()].reduce<number>(
    (m, v) => Math.min(m, v.segundosTotales),
    Infinity,
  );
  const utiles = todos.filter(
    (v) => v.tramos.length === 1 || v.segundosTotales < mejorDirecto,
  );

  return utiles
    .sort((a, b) => {
      if (a.fueraDeHorario !== b.fueraDeHorario) return a.fueraDeHorario ? 1 : -1;
      return peso(a) - peso(b);
    })
    .slice(0, limite);
}
