/**
 * Contrato de la API de llegadas.
 *
 * Refleja `docs/03-arquitectura.md` §3.6. Lo importante de estos tipos es lo
 * que *obligan*: un ETA nunca viaja solo. Siempre lleva su confianza, su origen
 * y su estado, y puede ser `null`.
 *
 * Eso no es un detalle técnico: es la propuesta de valor del producto expresada
 * en el sistema de tipos. Si el tipo no permitiera decir «no sé», la app no
 * podría decirlo por mucho que lo prometiera el diseño.
 */

export type Confianza = "alta" | "media" | "baja" | "sin_datos";

export type Fuente = "gps_oficial" | "telemetria" | "horario";

/** Estados del motor de estimación (`docs/04` §4.4). */
export type Estado =
  | "en_ruta"          // las fuentes concuerdan
  | "sin_telemetria"   // sólo hay dato oficial
  | "discrepancia"     // las fuentes no coinciden
  | "probable_desvio"  // evidencia de que cambió el recorrido
  | "no_llegara";      // alta confianza de que no pasa por aquí

export interface Llegada {
  recorrido: string;
  destino: string;
  /** Segundos hasta la llegada. `null` cuando no se puede estimar. */
  etaSegundos: number | null;
  /** Rango `[min, max]` en segundos. Nunca prometemos un número exacto. */
  rangoSegundos: [number, number] | null;
  confianza: Confianza;
  fuente: Fuente;
  estado: Estado;
  /** Cuántos usuarios a bordo sostienen la estimación. Explica la confianza. */
  personasABordo?: number;
  via?: string;
}

export interface Aviso {
  nivel: "advertencia" | "critico";
  titulo: string;
  cuerpo: string;
  /** Qué hacer en su lugar. Un aviso sin salida sólo traslada el problema. */
  alternativa?: string;
}

export interface RespuestaParadero {
  paraderoId: string;
  actualizadoHace: number;
  aviso?: Aviso;
  llegadas: Llegada[];
}
