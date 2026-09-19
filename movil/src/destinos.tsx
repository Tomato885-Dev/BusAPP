import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const CLAVE_LOCAL = "kupay.destinos";

/** Cuántos se recuerdan. Más allá de esto la lista deja de ser un atajo. */
const CUANTOS_GUARDAR = 12;
/** Cuántos se ofrecen en pantalla. */
export const CUANTOS_MOSTRAR = 4;

export interface Destino {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  veces: number;
  /** Marca de tiempo del último uso. */
  ultimaVez: number;
}

interface Contexto {
  frecuentes: Destino[];
  registrar: (lugar: { nombre: string; lat: number; lon: number }) => void;
  olvidar: (id: string) => void;
}

const ContextoDestinos = createContext<Contexto>({
  frecuentes: [],
  registrar: () => {},
  olvidar: () => {},
});

/**
 * Identidad de un lugar por su posición, no por su nombre.
 *
 * El mismo destino escrito distinto —«la U», «Beauchef 850»— tiene que contar
 * como uno solo. Cuatro decimales son unos once metros: suficiente para que dos
 * búsquedas del mismo portal coincidan y para que el edificio del lado no.
 */
const identidad = (lat: number, lon: number) => `${lat.toFixed(4)},${lon.toFixed(4)}`;

/**
 * Destinos frecuentes.
 *
 * Se guardan sólo en el dispositivo. Un destino habitual dice dónde estudia o
 * trabaja alguien; mandarlo al servidor sin necesidad sería recolectar por
 * recolectar, y la regla de `docs/03` §3.7 es guardar lo mínimo.
 */
export function ProveedorDestinos({ children }: { children: ReactNode }) {
  const [destinos, setDestinos] = useState<Destino[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_LOCAL)
      .then((crudo) => {
        if (crudo) setDestinos(JSON.parse(crudo));
      })
      .catch(() => {
        // Sin almacenamiento la app anda igual, sólo sin recordar destinos.
      });
  }, []);

  const guardar = useCallback((lista: Destino[]) => {
    setDestinos(lista);
    void AsyncStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista)).catch(() => {});
  }, []);

  const registrar = useCallback(
    (lugar: { nombre: string; lat: number; lon: number }) => {
      const id = identidad(lugar.lat, lugar.lon);
      setDestinos((actuales) => {
        const previo = actuales.find((d) => d.id === id);
        const nuevo: Destino = {
          id,
          // El nombre más reciente gana: si el usuario lo buscó de otra forma,
          // esa es la que tiene en la cabeza hoy.
          nombre: lugar.nombre,
          lat: lugar.lat,
          lon: lugar.lon,
          veces: (previo?.veces ?? 0) + 1,
          ultimaVez: Date.now(),
        };
        const lista = [nuevo, ...actuales.filter((d) => d.id !== id)]
          .sort((a, b) => b.veces - a.veces || b.ultimaVez - a.ultimaVez)
          .slice(0, CUANTOS_GUARDAR);
        void AsyncStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista)).catch(() => {});
        return lista;
      });
    },
    [],
  );

  const olvidar = useCallback(
    (id: string) => guardar(destinos.filter((d) => d.id !== id)),
    [destinos, guardar],
  );

  const frecuentes = useMemo(
    () =>
      [...destinos].sort((a, b) => b.veces - a.veces || b.ultimaVez - a.ultimaVez),
    [destinos],
  );

  const valor = useMemo<Contexto>(
    () => ({ frecuentes, registrar, olvidar }),
    [frecuentes, registrar, olvidar],
  );

  return <ContextoDestinos.Provider value={valor}>{children}</ContextoDestinos.Provider>;
}

export function useDestinos() {
  return useContext(ContextoDestinos);
}
