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

import { segundosEnSantiago } from "./red";
import { supabase } from "./supabase";
import { useSesion } from "./useSesion";

const CLAVE_LOCAL = "kupay.rutinas";

export interface Rutina {
  id: string;
  paraderoId: string;
  /** Minutos desde medianoche, hora de Santiago. */
  hora: number;
  /** 1 = lunes … 7 = domingo. */
  dias: number[];
  avisoMinutos: number;
  activa: boolean;
}

interface Contexto {
  rutinas: Rutina[];
  guardar: (rutina: Omit<Rutina, "id"> & { id?: string }) => Promise<void>;
  borrar: (id: string) => Promise<void>;
  /** La rutina que corresponde ahora mismo, si la hay. */
  rutinaActiva: Rutina | null;
  /** Minutos que faltan para la hora de la rutina activa. */
  minutosParaSalir: number | null;
}

const ContextoRutinas = createContext<Contexto>({
  rutinas: [],
  guardar: async () => {},
  borrar: async () => {},
  rutinaActiva: null,
  minutosParaSalir: null,
});

/** Día de la semana en Santiago: 1 = lunes … 7 = domingo. */
export function diaEnSantiago(momento = new Date()): number {
  const nombre = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    weekday: "short",
  }).format(momento);
  const orden: Record<string, number> = {
    Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
  };
  return orden[nombre] ?? 1;
}

/**
 * Decide si una rutina está «en su ventana»: dentro de los minutos de aviso
 * previos a la hora, y hasta cinco minutos después.
 *
 * Los cinco minutos de gracia existen porque alguien que ya va atrasado es
 * justamente quien más necesita ver la pantalla.
 */
export function ventanaDeRutina(rutina: Rutina, momento = new Date()): number | null {
  if (!rutina.activa) return null;
  if (!rutina.dias.includes(diaEnSantiago(momento))) return null;

  const ahoraMin = Math.floor(segundosEnSantiago(momento) / 60);
  const faltan = rutina.hora - ahoraMin;
  if (faltan > rutina.avisoMinutos || faltan < -5) return null;
  return faltan;
}

export function ProveedorRutinas({ children }: { children: ReactNode }) {
  const { usuarioId } = useSesion();
  const [rutinas, setRutinas] = useState<Rutina[]>([]);
  // Se recalcula cada minuto para que la ventana se abra sola sin tocar nada.
  const [tic, setTic] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTic((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_LOCAL)
      .then((crudo) => {
        if (crudo) setRutinas(JSON.parse(crudo));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!usuarioId || !supabase) return;
    let vigente = true;
    supabase
      .from("rutinas")
      .select("id, paradero_id, hora, dias, aviso_minutos, activa")
      .then(({ data, error }) => {
        if (!vigente || error || !data) return;
        const delServidor: Rutina[] = data.map((r) => ({
          id: r.id as string,
          paraderoId: r.paradero_id as string,
          hora: r.hora as number,
          dias: r.dias as number[],
          avisoMinutos: r.aviso_minutos as number,
          activa: r.activa as boolean,
        }));
        setRutinas(delServidor);
        void AsyncStorage.setItem(CLAVE_LOCAL, JSON.stringify(delServidor)).catch(() => {});
      });
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  const persistir = useCallback(async (nuevas: Rutina[]) => {
    setRutinas(nuevas);
    await AsyncStorage.setItem(CLAVE_LOCAL, JSON.stringify(nuevas)).catch(() => {});
  }, []);

  const guardar = useCallback(
    async (entrada: Omit<Rutina, "id"> & { id?: string }) => {
      const id = entrada.id ?? `local-${Date.now()}`;
      const rutina: Rutina = { ...entrada, id };

      // Primero la pantalla, después el servidor: con red mala la app no puede
      // quedarse congelada.
      await persistir(
        entrada.id
          ? rutinas.map((r) => (r.id === entrada.id ? rutina : r))
          : [...rutinas, rutina],
      );

      if (usuarioId && supabase) {
        const fila = {
          usuario_id: usuarioId,
          paradero_id: rutina.paraderoId,
          hora: rutina.hora,
          dias: rutina.dias,
          aviso_minutos: rutina.avisoMinutos,
          activa: rutina.activa,
        };
        const { data } = entrada.id?.startsWith("local-") === false
          ? await supabase.from("rutinas").update(fila).eq("id", entrada.id).select("id")
          : await supabase.from("rutinas").insert(fila).select("id");
        // El servidor asigna el identificador definitivo.
        const idServidor = data?.[0]?.id as string | undefined;
        if (idServidor && idServidor !== id) {
          await persistir(
            (entrada.id ? rutinas.map((r) => (r.id === entrada.id ? rutina : r)) : [...rutinas, rutina])
              .map((r) => (r.id === id ? { ...r, id: idServidor } : r)),
          );
        }
      }
    },
    [rutinas, usuarioId, persistir],
  );

  const borrar = useCallback(
    async (id: string) => {
      await persistir(rutinas.filter((r) => r.id !== id));
      if (usuarioId && supabase && !id.startsWith("local-")) {
        await supabase.from("rutinas").delete().eq("id", id);
      }
    },
    [rutinas, usuarioId, persistir],
  );

  const { rutinaActiva, minutosParaSalir } = useMemo(() => {
    for (const r of rutinas) {
      const faltan = ventanaDeRutina(r);
      if (faltan !== null) return { rutinaActiva: r, minutosParaSalir: faltan };
    }
    return { rutinaActiva: null, minutosParaSalir: null };
    // `tic` fuerza el recálculo cada minuto.
  }, [rutinas, tic]);

  const valor = useMemo<Contexto>(
    () => ({ rutinas, guardar, borrar, rutinaActiva, minutosParaSalir }),
    [rutinas, guardar, borrar, rutinaActiva, minutosParaSalir],
  );

  return <ContextoRutinas.Provider value={valor}>{children}</ContextoRutinas.Provider>;
}

export function useRutinas() {
  return useContext(ContextoRutinas);
}

/** Formatea minutos desde medianoche como «7:40». */
export function horaTexto(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export const NOMBRES_DIAS = ["L", "M", "X", "J", "V", "S", "D"];

export function diasTexto(dias: number[]): string {
  if (dias.length === 7) return "Todos los días";
  if (dias.length === 5 && dias.every((d) => d <= 5)) return "Días hábiles";
  if (dias.length === 2 && dias.includes(6) && dias.includes(7)) return "Fin de semana";
  return dias
    .slice()
    .sort()
    .map((d) => NOMBRES_DIAS[d - 1])
    .join(" ");
}
