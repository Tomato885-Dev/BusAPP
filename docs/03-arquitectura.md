# 03 — Arquitectura del sistema

## 3.1 Por qué hay un backend

El brief describe la app como si todo ocurriera en el teléfono. No puede ser así,
por cuatro razones independientes —cada una suficiente por sí sola:

1. **La fusión de datos es colectiva.** "12 usuarios reportaron un desvío" es una
   afirmación que ningún teléfono puede hacer por su cuenta: requiere ver los
   reportes de todos.
2. **Las credenciales deben estar en el servidor.** Si el DTPM entrega acceso con
   clave o con IP fija, esa clave no puede vivir en el binario de la app: cualquiera
   puede extraerla de un `.ipa`.
3. **Aislamiento frente al cambio de fuentes** (`01`, §1.5). Cambiar de proveedor
   de datos debe ser un despliegue de servidor, no una actualización de app que
   además depende de que el usuario la instale.
4. **El histórico vive en algún lado.** Predecir mejor que el horario oficial exige
   acumular observaciones pasadas, y eso no cabe ni tiene sentido en el dispositivo.

## 3.2 Vista general

```
┌──────────────────────────────────────────────────────────────┐
│                         APP MÓVIL                            │
│  Paraderos cercanos · Llegadas · Mapa · Favoritos · Reportes │
│  Caché local SQLite (GTFS) · Ubicación · Push                │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / JSON
┌───────────────────────────▼──────────────────────────────────┐
│                       API BUS CHECKER                        │
│   /stops/nearby   /stops/{id}/arrivals   /plan   /reports    │
└───┬──────────────────┬───────────────────┬───────────────────┘
    │                  │                   │
    ▼                  ▼                   ▼
┌─────────┐   ┌─────────────────┐   ┌──────────────────┐
│ Motor   │   │ Planificador    │   │ Servicio de      │
│ de ETA  │   │ de viajes (OTP) │   │ reportes         │
│ (doc 04)│   │                 │   │ + reputación     │
└────┬────┘   └────────┬────────┘   └────────┬─────────┘
     │                 │                     │
     └─────────────────┼─────────────────────┘
                       ▼
        ┌──────────────────────────────┐
        │  PostgreSQL + PostGIS        │
        │  GTFS · reportes · histórico │
        │  Redis (estado en vivo, TTL) │
        └──────────────▲───────────────┘
                       │
        ┌──────────────┴───────────────┐
        │   INGESTA (procesos batch    │
        │   y de streaming)            │
        │  · GTFS estático (semanal)   │
        │  · GPS / RT (cada 30 s)      │
        │  · Telemetría de usuarios    │
        └──────────────────────────────┘
```

## 3.3 Stack sugerido para el backend

| Componente | Elección | Por qué |
|---|---|---|
| Lenguaje / framework | **Python + FastAPI** | El ecosistema GTFS y geoespacial de Python (`gtfs-kit`, `partridge`, `shapely`, `pandas`) es el más maduro. Ahorra semanas en la ingesta. |
| Base de datos | **PostgreSQL + PostGIS** | Consultas como "paraderos dentro de 400 m" son una línea de SQL. Es la herramienta correcta para datos geográficos. |
| Caché / estado en vivo | **Redis** | Posiciones de buses y ETAs vigentes, con expiración automática. No tiene sentido persistirlos. |
| Planificación de viajes | **OpenTripPlanner 2** | Ver §3.5. |
| Ingesta programada | Cron / APScheduler | Actualización del GTFS y refresco de datos en vivo. |
| Despliegue | Contenedores (Fly.io, Railway, Hetzner) | Coste bajo al inicio; evitar sobre-ingeniería con Kubernetes en fase 1. |

**Alternativa razonable:** Node.js + TypeScript, si se elige React Native para el
cliente. Compartir lenguaje entre app y servidor tiene valor real para un
desarrollador solo. El costo es un ecosistema GTFS más pobre, que se paga en la
ingesta.

## 3.4 Modelo de datos (esbozo)

**Desde el GTFS** (se regenera completo en cada actualización del feed):
`agencies`, `routes`, `trips`, `stops` (con columna `geography(Point)` indexada
con GIST), `stop_times`, `shapes`, `calendar`.

**Propias del producto:**

```sql
-- Reportes de usuarios sobre situaciones excepcionales
user_reports(
  id, user_id, route_id, stop_id, type, -- desvio | no_pasa | corte_calle | lleno | otro
  location geography(Point), reported_at,
  confirmations int, denials int, status  -- activo | expirado | descartado
)

-- Observaciones crudas de posición (oficial o telemetría de usuarios)
vehicle_observations(
  id, source,          -- oficial | telemetria_usuario
  route_id, trip_id, location geography(Point),
  observed_at, confidence, anon_session_id  -- nunca user_id: ver §3.7
)

-- Histórico de llegadas reales, insumo del motor de predicción
arrival_history(
  stop_id, route_id, scheduled_at, actual_at,
  day_of_week, hour_bucket, weather_flag
)

-- Reputación, para ponderar reportes y frenar abuso
user_reputation(user_id, score, reports_total, reports_confirmed, updated_at)
```

`arrival_history` es la tabla que hace que el producto **mejore con el tiempo**.
Aunque en la fase 1 no se use para predecir, **conviene empezar a llenarla desde
el primer día**: los datos que no se guardan hoy no se pueden recuperar mañana.

## 3.5 Planificación de viajes: no construirla desde cero

Calcular la mejor ruta multimodal con transbordos y horarios es un problema
resuelto y difícil (algoritmos RAPTOR, CSA). Implementarlo bien toma meses.

**Usar [OpenTripPlanner 2](https://www.opentripplanner.org/):** es open source,
consume GTFS directamente, soporta combinación bus + metro + caminata, entrega
alternativas y detalles paso a paso, y admite GTFS-Realtime cuando esté
disponible. Se despliega como un servicio aparte y la API propia actúa de
fachada.

Esto convierte una funcionalidad de varios meses en una de días de integración.
El esfuerzo propio se concentra donde sí hay diferenciación: el motor de
estimación (`04`).

## 3.6 API pública (borrador)

```
GET  /v1/stops/nearby?lat=&lon=&radius=400
GET  /v1/stops/{stop_id}
GET  /v1/stops/{stop_id}/arrivals        ← la llamada más importante del producto
GET  /v1/routes/{route_id}/shape
GET  /v1/alerts?stop_id=&route_id=
POST /v1/reports
POST /v1/reports/{id}/confirm
GET  /v1/plan?from=&to=&departure_time=
POST /v1/telemetry                       ← fase posterior
```

Respuesta de `/arrivals` — obsérvese que **el ETA nunca viaja solo**, siempre va
acompañado de su nivel de confianza y de su origen:

```jsonc
{
  "stop_id": "PA420",
  "updated_at": "2026-09-19T14:32:10Z",
  "arrivals": [
    {
      "route_id": "506",
      "headsign": "Peñalolén",
      "eta_seconds": 240,
      "eta_range": [180, 360],       // nunca prometer precisión que no se tiene
      "confidence": "alta",          // alta | media | baja | sin_datos
      "source": "gps_oficial",       // gps_oficial | telemetria | horario
      "status": "en_ruta"            // en_ruta | desviado | no_llegara | sin_info
    },
    {
      "route_id": "210",
      "eta_seconds": null,
      "confidence": "baja",
      "source": "horario",
      "status": "desviado",
      "note": "8 usuarios reportaron desvío en los últimos 30 min"
    }
  ]
}
```

Este contrato es la traducción técnica de la propuesta de valor: **la app debe
poder decir "no sé" y "esta micro no va a llegar"**, no sólo un número de
minutos. Si el modelo de datos no admite esas respuestas, el producto no puede
darlas por mucho que lo prometa la interfaz.

## 3.7 Privacidad — requisito de diseño, no trámite legal

La ubicación de una persona en transporte público revela dónde vive, dónde
trabaja y a qué hora sale de su casa. Tratarlo a la ligera es, además de un
riesgo legal bajo la Ley 19.628 y su reforma, un riesgo reputacional serio para
una app que pide justamente ese permiso.

Reglas que deben estar en el diseño desde el inicio:

1. **Telemetría siempre opt-in explícito.** Nunca activada por defecto, nunca
   escondida en los términos.
2. **Separar identidad de trayectoria.** Las observaciones se guardan con un
   identificador de sesión rotatorio, no con el `user_id`. Sin esto, la base de
   datos contiene el mapa de movimientos de cada usuario.
3. **Retención corta para datos crudos.** Las posiciones individuales se
   descartan tras procesarse; sólo sobreviven los agregados.
4. **Recortar los extremos del trayecto.** No registrar los primeros y últimos
   minutos, que son los que revelan domicilio y destino.
5. **Explicar el permiso en el momento y en castellano claro**, justo antes de
   pedirlo y no en una pantalla de bienvenida que nadie lee. Esto además mejora
   de forma notable la tasa de aceptación.
6. **Funcionar sin permiso de ubicación.** Buscar paraderos por nombre debe ser
   un camino de primera clase, no un plan B degradado.

## 3.8 Sobre la ubicación en segundo plano y App Store

La revisión de App Store examina con particular atención el uso de ubicación en
background. Para aprobarlo hace falta:

- Una justificación funcional clara y visible para el usuario.
- Un texto de permiso (`NSLocationAlwaysAndWhenInUseUsageDescription`) que
  explique el beneficio concreto, no una frase genérica.
- Que la app siga siendo útil si el permiso se deniega.

**Consecuencia para el plan:** no introducir background en el primer envío a
revisión. Lanzar con ubicación sólo en uso, consolidar la app, y agregar la
telemetría en una versión posterior, cuando exista un historial y una
justificación demostrable. Un rechazo en el primer envío cuesta semanas.
