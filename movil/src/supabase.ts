/**
 * Cliente de Supabase.
 *
 * **La app funciona sin esto.** Si no hay credenciales configuradas,
 * `hayServidor` queda en falso y todo sigue leyendo la red desde `red.json`.
 * Esa caída limpia es deliberada: permite publicar y revisar la app sin
 * depender de que el servidor esté en pie.
 *
 * ## Sobre las llaves
 *
 * La llave **anónima** (`anon`) está pensada para ir dentro de la aplicación:
 * es pública por diseño, y lo que impide que alguien lea o escriba de más son
 * las políticas de seguridad por fila de `servidor/esquema.sql`, no el secreto
 * de la llave.
 *
 * La llave **de servicio** (`service_role`) omite todas esas políticas. **Nunca
 * puede estar en la app**: cualquiera puede extraerla de un binario o del
 * paquete web. Vive sólo en el proceso de ingesta, del lado del servidor.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const LLAVE_ANONIMA = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const hayServidor = Boolean(URL && LLAVE_ANONIMA);

export const supabase: SupabaseClient | null = hayServidor
  ? createClient(URL!, LLAVE_ANONIMA!, {
      auth: {
        // En web el almacenamiento del navegador ya sirve; en el teléfono hay
        // que darle dónde guardar la sesión para que sobreviva al cierre.
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // No hay enlaces de confirmación por correo: no hay correo.
        detectSessionInUrl: false,
      },
    })
  : null;

/**
 * Asegura que haya una sesión, sin pedirle nada al usuario.
 *
 * Es el «sistema para reconocer usuarios sin inicio de sesión»: al abrir la app
 * por primera vez se crea una sesión anónima que devuelve un identificador
 * estable. La persona no ve ninguna pantalla y desde el servidor es un usuario
 * identificable y contable.
 *
 * Límite conocido: el identificador vive en el dispositivo. Si se borran los
 * datos de la app o se cambia de teléfono, es un usuario nuevo
 * (`docs/03-arquitectura.md` §3.7b).
 */
export async function asegurarSesion(): Promise<string | null> {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id) {
    void supabase.rpc("registrar_visita");
    return data.session.user.id;
  }

  const { data: nueva, error } = await supabase.auth.signInAnonymously();
  if (error || !nueva.user) return null;

  void supabase.rpc("registrar_visita");
  return nueva.user.id;
}
