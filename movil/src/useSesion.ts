import { useEffect, useState } from "react";

import { asegurarSesion, hayServidor } from "./supabase";

/**
 * Identidad del usuario, sin pantalla de inicio de sesión.
 *
 * Al abrir la app se crea una sesión anónima que devuelve un identificador
 * estable. La persona no ve nada; desde el servidor es un usuario contable.
 *
 * Si no hay servidor configurado devuelve `null` y la app sigue funcionando con
 * almacenamiento local.
 */
export function useSesion() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [listo, setListo] = useState(!hayServidor);

  useEffect(() => {
    if (!hayServidor) return;
    let vigente = true;
    asegurarSesion()
      .then((id) => vigente && setUsuarioId(id))
      .finally(() => vigente && setListo(true));
    return () => {
      vigente = false;
    };
  }, []);

  return { usuarioId, listo, conServidor: hayServidor };
}
