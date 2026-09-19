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

const CLAVE_LOCAL = "buschecker.favoritos";

interface Contexto {
  favoritos: string[];
  esFavorito: (paraderoId: string) => boolean;
  alternar: (paraderoId: string) => void;
  sincronizado: boolean;
}

const ContextoFavoritos = createContext<Contexto>({
  favoritos: [],
  esFavorito: () => false,
  alternar: () => {},
  sincronizado: false,
});

/**
 * Favoritos del usuario.
 *
 * Guarda siempre en el dispositivo, y además en el servidor cuando hay sesión.
 * El orden importa: **primero se actualiza la pantalla, después se guarda**. Si
 * la red está mala —que es lo normal esperando una micro— el usuario no puede
 * quedarse mirando una estrella que no reacciona.
 */
export function ProveedorFavoritos({ children }: { children: ReactNode }) {
  const { usuarioId } = useSesion();
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [sincronizado, setSincronizado] = useState(false);

  // Carga local inmediata.
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_LOCAL)
      .then((crudo) => {
        if (crudo) setFavoritos(JSON.parse(crudo));
      })
      .catch(() => {
        // Sin almacenamiento la app sigue andando, sólo sin recordar favoritos.
      });
  }, []);

  // Cuando hay sesión, el servidor manda: puede traer favoritos de otro
  // dispositivo del mismo usuario.
  useEffect(() => {
    if (!usuarioId || !supabase) return;
    let vigente = true;
    supabase
      .from("favoritos")
      .select("paradero_id")
      .then(({ data, error }) => {
        if (!vigente || error || !data) return;
        const delServidor = data.map((f) => f.paradero_id as string);
        setFavoritos((locales) => {
          const union = [...new Set([...locales, ...delServidor])];
          // Los locales que el servidor no tiene se suben.
          const faltantes = locales.filter((id) => !delServidor.includes(id));
          if (faltantes.length) {
            void supabase!
              .from("favoritos")
              .upsert(faltantes.map((id) => ({ usuario_id: usuarioId, paradero_id: id })));
          }
          void AsyncStorage.setItem(CLAVE_LOCAL, JSON.stringify(union)).catch(() => {});
          return union;
        });
        setSincronizado(true);
      });
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  const alternar = useCallback(
    (paraderoId: string) => {
      setFavoritos((actuales) => {
        const estaba = actuales.includes(paraderoId);
        const nuevos = estaba
          ? actuales.filter((id) => id !== paraderoId)
          : [...actuales, paraderoId];

        void AsyncStorage.setItem(CLAVE_LOCAL, JSON.stringify(nuevos)).catch(() => {});

        if (usuarioId && supabase) {
          const peticion = estaba
            ? supabase
                .from("favoritos")
                .delete()
                .eq("usuario_id", usuarioId)
                .eq("paradero_id", paraderoId)
            : supabase
                .from("favoritos")
                .upsert({ usuario_id: usuarioId, paradero_id: paraderoId });
          void peticion.then(() => {});
        }

        return nuevos;
      });
    },
    [usuarioId],
  );

  const valor = useMemo<Contexto>(
    () => ({
      favoritos,
      esFavorito: (id: string) => favoritos.includes(id),
      alternar,
      sincronizado,
    }),
    [favoritos, alternar, sincronizado],
  );

  return <ContextoFavoritos.Provider value={valor}>{children}</ContextoFavoritos.Provider>;
}

export function useFavoritos() {
  return useContext(ContextoFavoritos);
}
