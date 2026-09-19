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

import { supabase } from "./supabase";
import { useSesion } from "./useSesion";

const CLAVE_PRUEBA = "kupay.premium_de_prueba";

interface Contexto {
  esPremium: boolean;
  /** true cuando el premium viene del interruptor de prueba y no de un pago. */
  deSimulacion: boolean;
  activarPrueba: (valor: boolean) => Promise<void>;
}

const ContextoPremium = createContext<Contexto>({
  esPremium: false,
  deSimulacion: false,
  activarPrueba: async () => {},
});

/**
 * Estado de la suscripción.
 *
 * El estado real se **lee** de la tabla `suscripciones`, que sólo escribe el
 * servidor cuando la tienda confirma un pago. Si la app pudiera escribirla,
 * cualquiera se regalaría premium modificando la petición.
 *
 * Mientras no exista el cobro real hay un interruptor de prueba, guardado sólo
 * en el dispositivo, para poder diseñar y revisar las dos versiones. Va
 * marcado en pantalla como simulación: nunca debe confundirse con un pago.
 */
export function ProveedorPremium({ children }: { children: ReactNode }) {
  const { usuarioId } = useSesion();
  const [delServidor, setDelServidor] = useState(false);
  const [deSimulacion, setDeSimulacion] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_PRUEBA)
      .then((v) => setDeSimulacion(v === "1"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!usuarioId || !supabase) return;
    let vigente = true;
    supabase
      .from("suscripciones")
      .select("activa, hasta")
      .eq("usuario_id", usuarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (!vigente || !data) return;
        const vigenteAun = !data.hasta || new Date(data.hasta as string) > new Date();
        setDelServidor(Boolean(data.activa) && vigenteAun);
      });
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  const activarPrueba = useCallback(async (valor: boolean) => {
    setDeSimulacion(valor);
    await AsyncStorage.setItem(CLAVE_PRUEBA, valor ? "1" : "0").catch(() => {});
  }, []);

  const valor = useMemo<Contexto>(
    () => ({
      esPremium: delServidor || deSimulacion,
      deSimulacion: deSimulacion && !delServidor,
      activarPrueba,
    }),
    [delServidor, deSimulacion, activarPrueba],
  );

  return <ContextoPremium.Provider value={valor}>{children}</ContextoPremium.Provider>;
}

export function usePremium() {
  return useContext(ContextoPremium);
}
