import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { distanciaM } from "./mapa/proyeccion";
import { avisarBajada } from "./notificaciones";
import { PARADERO_POR_ID, RECORRIDO_POR_ID } from "./red";

const CLAVE_LOCAL = "kupay.viaje";

export interface Viaje {
  recorridoId: string;
  /** Índice de la parada donde se subió, dentro de la secuencia del recorrido. */
  desde: number;
  /** Índice de la parada donde se baja. */
  hasta: number;
  /** Cuántas paradas antes avisar. */
  avisoParadas: number;
  iniciadoEn: number;
}

export interface Progreso {
  /** Índice de la parada más cercana ahora mismo. */
  actual: number;
  paradasRestantes: number;
  /** Nombre de la parada donde se baja. */
  destino: string;
  /** Metros en línea recta hasta la parada de bajada. */
  metros: number;
  /** Si todavía no hay ubicación con qué calcular. */
  sinUbicacion: boolean;
}

interface Contexto {
  viaje: Viaje | null;
  progreso: Progreso | null;
  iniciar: (viaje: Omit<Viaje, "iniciadoEn">) => Promise<void>;
  terminar: () => Promise<void>;
}

const ContextoViaje = createContext<Contexto>({
  viaje: null,
  progreso: null,
  iniciar: async () => {},
  terminar: async () => {},
});

/**
 * Modo viaje: «avísame antes de bajarme».
 *
 * El usuario declara en qué recorrido va y dónde se baja. La app sigue su
 * posición y cuenta las paradas que faltan.
 *
 * La cuenta se hace sobre la **secuencia de paradas del recorrido**, no sobre
 * la distancia en línea recta: una micro que va rodeando puede estar a 300
 * metros del destino y tener todavía cuatro paradas por delante. Lo que el
 * pasajero necesita saber es cuántas veces más se abre la puerta, no cuántos
 * metros hay a vuelo de pájaro.
 *
 * Nota de producto: ésta es, además, la única función donde el usuario
 * **declara** el recorrido en que viaja. Eso es verdad de terreno regalada
 * para el motor de estimación (`docs/04` §4.7).
 */
export function ProveedorViaje({ children }: { children: ReactNode }) {
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const [posicion, setPosicion] = useState<{ lat: number; lon: number } | null>(null);
  const avisado = useRef(false);

  // Se rescata de disco: si la app se cerró yendo en la micro, el viaje sigue.
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_LOCAL)
      .then((crudo) => {
        if (crudo) setViaje(JSON.parse(crudo));
      })
      .catch(() => {});
  }, []);

  // La ubicación sólo se sigue mientras hay un viaje en curso. Seguirla siempre
  // gastaría batería para nada y sería indefendible en la ficha de la tienda.
  useEffect(() => {
    if (!viaje) {
      setPosicion(null);
      return;
    }
    let suscripcion: Location.LocationSubscription | null = null;
    let vigente = true;
    (async () => {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (!permiso.granted || !vigente) return;
        suscripcion = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 5000 },
          (p) => setPosicion({ lat: p.coords.latitude, lon: p.coords.longitude }),
        );
      } catch {
        // Sin ubicación el viaje se muestra igual, diciendo que no puede contar.
      }
    })();
    return () => {
      vigente = false;
      suscripcion?.remove();
    };
  }, [viaje]);

  const progreso = useMemo<Progreso | null>(() => {
    if (!viaje) return null;
    const recorrido = RECORRIDO_POR_ID.get(viaje.recorridoId);
    if (!recorrido) return null;

    const paradaDestino = PARADERO_POR_ID.get(recorrido.paradas[viaje.hasta]);
    const destino = paradaDestino?.nombre ?? "tu parada";

    if (!posicion || !paradaDestino) {
      return {
        actual: viaje.desde,
        paradasRestantes: viaje.hasta - viaje.desde,
        destino,
        metros: 0,
        sinUbicacion: true,
      };
    }

    // La parada más cercana **dentro del tramo que falta**. Limitarlo al tramo
    // evita que un recorrido que pasa dos veces cerca del mismo punto haga
    // saltar la cuenta hacia atrás.
    let actual = viaje.desde;
    let mejor = Infinity;
    for (let i = viaje.desde; i <= viaje.hasta; i++) {
      const p = PARADERO_POR_ID.get(recorrido.paradas[i]);
      if (!p) continue;
      const d = distanciaM(posicion, p);
      if (d < mejor) {
        mejor = d;
        actual = i;
      }
    }

    return {
      actual,
      paradasRestantes: Math.max(0, viaje.hasta - actual),
      destino,
      metros: Math.round(distanciaM(posicion, paradaDestino)),
      sinUbicacion: false,
    };
  }, [viaje, posicion]);

  // El aviso se dispara una sola vez por viaje.
  useEffect(() => {
    if (!viaje || !progreso || progreso.sinUbicacion || avisado.current) return;
    if (progreso.paradasRestantes > viaje.avisoParadas) return;
    avisado.current = true;
    avisarBajada(progreso.destino, progreso.paradasRestantes);
  }, [viaje, progreso]);

  const iniciar = useCallback(async (nuevo: Omit<Viaje, "iniciadoEn">) => {
    const v: Viaje = { ...nuevo, iniciadoEn: Date.now() };
    avisado.current = false;
    setViaje(v);
    await AsyncStorage.setItem(CLAVE_LOCAL, JSON.stringify(v)).catch(() => {});
  }, []);

  const terminar = useCallback(async () => {
    avisado.current = false;
    setViaje(null);
    await AsyncStorage.removeItem(CLAVE_LOCAL).catch(() => {});
  }, []);

  const valor = useMemo<Contexto>(
    () => ({ viaje, progreso, iniciar, terminar }),
    [viaje, progreso, iniciar, terminar],
  );

  return <ContextoViaje.Provider value={valor}>{children}</ContextoViaje.Provider>;
}

export function useViaje() {
  return useContext(ContextoViaje);
}

/** «2 paradas», «la próxima», «llegaste». */
export function paradasTexto(restantes: number): string {
  if (restantes <= 0) return "Llegaste";
  if (restantes === 1) return "La próxima";
  return `${restantes} paradas`;
}
