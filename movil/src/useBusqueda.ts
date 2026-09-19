import { useEffect, useState } from "react";

import { buscarTodo, type Lugar } from "./geocodificador";

/** Espera antes de consultar, para no pedir en cada tecla. */
const ESPERA_MS = 400;

/**
 * Búsqueda de lugares con retardo y cancelación.
 *
 * El retardo respeta el límite de un pedido por segundo de Nominatim y evita
 * lanzar una consulta por cada letra escrita.
 */
export function useBusqueda(texto: string) {
  const [resultados, setResultados] = useState<Lugar[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (texto.trim().length < 3) {
      setResultados([]);
      setBuscando(false);
      return;
    }

    const control = new AbortController();
    setBuscando(true);
    const temporizador = setTimeout(async () => {
      const salida = await buscarTodo(texto, control.signal);
      if (!control.signal.aborted) {
        setResultados(salida);
        setBuscando(false);
      }
    }, ESPERA_MS);

    return () => {
      clearTimeout(temporizador);
      control.abort();
      setBuscando(false);
    };
  }, [texto]);

  return { resultados, buscando };
}
