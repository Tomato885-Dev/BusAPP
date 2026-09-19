# 01 — Fuentes de datos

Este es el documento más importante del proyecto. Todo lo demás —arquitectura,
stack, roadmap— depende de qué datos se puedan obtener realmente y con qué
garantías. Diseñar la app antes de resolver esto es construir sobre supuestos.

## 1.1 El problema en una frase

El dato que hace **único** a Kupay (saber dónde está cada bus para decidir
si realmente viene) es precisamente el dato que **no** está disponible de forma
pública, abierta y estable.

## 1.2 Qué hay disponible hoy

### GTFS estático — disponible y abierto ✅

Es el catálogo completo de la red: paraderos con coordenadas, recorridos,
secuencias de paradas, trazados geográficos, frecuencias y horarios programados.

- Publicado por el DTPM (Directorio de Transporte Público Metropolitano).
- Descarga histórica: `dtpm.cl/descargas/gtfs/GTFS.zip`
- También replicado en el Portal de Datos Abiertos (`datos.gob.cl`).
- Formato estándar internacional (GTFS), con ecosistema maduro de herramientas.

**Qué habilita:** buscador de paraderos, paraderos cercanos, mapa de recorridos,
trazado de líneas, planificación de viajes basada en horarios, y el "esqueleto"
sobre el que se monta todo lo demás.

**Qué NO habilita:** saber dónde está un bus ahora.

> ⚠️ **Verificar antes de construir:** hay que confirmar la URL vigente, la
> frecuencia de actualización del feed y —crítico— **los términos de licencia**
> para uso en una aplicación comercial o con publicidad. No asumir que "dato
> público" equivale a "libre para cualquier uso". Esta verificación es la
> tarea F0-1 del roadmap.

### Metro de Santiago — parcialmente disponible ⚠️

El estado operativo de las estaciones (operativa, cerrada temporalmente,
deshabilitada, acceso cerrado) es consultable. Metro opera por frecuencia, no por
horario de llegada, así que "cuándo llega el tren" es menos relevante que en
buses; lo que importa es el estado del servicio y el tiempo de viaje entre
estaciones.

### Posiciones GPS de buses y predicción oficial — NO abierto ❌

Este es el bloqueador.

- La app oficial Red Movilidad tiene un "Predictor" de llegada, alimentado por
  datos de flota que el DTPM no publica como feed abierto.
- Históricamente, el acceso a los servicios de posicionamiento y predicción se
  gestiona **directamente con el DTPM**, mediante solicitud formal por correo
  indicando el uso previsto de la información.
- Reportes de desarrolladores describen ese proceso como lento y con requisitos
  de infraestructura, incluyendo **IP fija** para el consumo del servicio.
- **No hay constancia de un feed GTFS-Realtime público del DTPM** (el estándar
  que usan la mayoría de las ciudades para publicar `VehiclePositions` y
  `TripUpdates`).

### APIs comunitarias — existen, pero no son base para un producto ⚠️

Hay envoltorios mantenidos por la comunidad (por ejemplo `api.xor.cl/red/...`,
`muZk/red-api`) que obtienen información de llegadas por paradero, estado del
Metro y saldo Bip! consultando el sitio oficial de Red.

Son útiles **para prototipar**, pero no para producción:

| Problema | Consecuencia |
|---|---|
| Obtienen los datos por *scraping* del sitio oficial | Un rediseño de red.cl rompe la app sin aviso |
| Sin SLA, sin garantía de disponibilidad | Tu app se cae cuando se cae un servicio de terceros que no controlas |
| Sin límites de uso documentados | Riesgo de bloqueo al crecer el tráfico |
| Situación legal ambigua respecto a los términos de uso de la fuente | Riesgo al monetizar o al publicar en App Store |
| No entregan posiciones GPS ni el modelo de predicción | Tampoco resuelven el problema central |

**Conclusión:** sirven como fuente temporal para validar la idea, jamás como
dependencia permanente. Y si se usan, debe ser detrás de una abstracción que
permita reemplazarlas (ver §1.5).

## 1.3 Qué significa esto para el producto

El brief propone combinar (a) datos oficiales de posición y (b) información de
usuarios. Si (a) no está disponible, el producto se apoya sólo en (b) y en
horarios programados. Eso cambia la propuesta de valor:

| Escenario | Qué puede prometer Kupay |
|---|---|
| **A. Con acceso oficial a GPS/predictor** | La visión completa del brief: "esta micro está a 3 cuadras y viene hacia acá", detección automática de desvíos, "esta micro no va a llegar". |
| **B. Sin acceso oficial, con telemetría propia** | Posición real de los buses deducida de los usuarios a bordo. Equivalente funcional del escenario A, y **bajo control propio**. Depende de densidad local de usuarios (`04` §4.7). |
| **C. Sin acceso oficial y sin usuarios (día 1)** | Horarios programados y mapas. Es decir: una app más, sin diferenciador. |

El escenario C es el punto de partida inevitable de cualquier lanzamiento. La
estrategia del proyecto consiste en **salir de C lo antes posible**, y para eso
hay dos caminos que conviene recorrer en paralelo:

1. **Gestionar el acceso oficial con el DTPM desde ya.** Es un trámite lento;
   iniciarlo el primer mes y no el sexto puede ahorrar medio año de calendario.
   Es una tarea administrativa, no de ingeniería, y por eso es fácil postergarla.
2. **Diseñar el producto para que sea útil incluso en el escenario C**, de modo
   que atraiga a los usuarios que después alimentan el escenario B.

## 1.4 El camino principal: la telemetría de los propios usuarios

Hay una fuente que no depende de ningún permiso, y que es **el núcleo del
producto** (`04`): **los usuarios que van arriba de la micro**.

Si una persona viaja en la línea 506 con la app abierta y el sistema puede
inferir que va a bordo de ese bus (por velocidad, por coincidencia de su
trayectoria con el trazado del recorrido, o porque lo declaró), su GPS es, en
la práctica, el GPS del bus.

A diferencia de Waze, **el usuario no reporta nada**: no hay ninguna acción que
tomar. Eso cambia por completo la aritmética de participación —aportan todos los
que dieron el permiso, no el pequeño porcentaje que se molesta en reportar— y
convierte esto en la vía principal hacia el escenario A, bajo control propio.

Implicancias que hay que asumir desde el diseño:

- Requiere **ubicación en segundo plano**, lo que implica una justificación
  sólida ante la revisión de App Store y una explicación clara al usuario
  (ver `03-arquitectura.md`, §Privacidad).
- Es un problema de **privacidad serio**: la trayectoria de una persona en
  transporte público es dato sensible. Debe anonimizarse en el servidor,
  descartarse el trayecto de origen/destino individual, y ser estrictamente
  opcional (*opt-in*, no *opt-out*).
- Consume batería. La gente desinstala apps que le gastan la batería.
- Es vulnerable a datos falsos y requiere validación cruzada.

## 1.5 Decisión de diseño que se deriva de todo esto

**Toda fuente de datos debe estar detrás de una interfaz común en el backend, y
la app nunca debe hablar directamente con una fuente externa.**

```
                    ┌──────────────────────────┐
   App móvil  ───►  │   API propia Kupay │
                    └───────────┬──────────────┘
                                │
                ┌───────────────┼───────────────┬───────────────┐
                ▼               ▼               ▼               ▼
        ┌──────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐
        │ GTFS estático│ │ GPS oficial│ │ Telemetría │ │ Reportes     │
        │   (DTPM)     │ │ (si se     │ │ de usuarios│ │ manuales     │
        │              │ │  consigue) │ │ a bordo ⭐ │ │ (opcional)   │
        └──────────────┘ └────────────┘ └────────────┘ └──────────────┘
             ✅ hoy         ❌ gestionar     🔨 el núcleo    ❔ por decidir
```

Beneficios de esta separación:

- Se puede lanzar con la fuente que haya y **sumar fuentes sin tocar la app**.
- Si una fuente comunitaria se cae o se reemplaza por el acceso oficial, sólo
  cambia un adaptador en el servidor; nadie tiene que actualizar la app.
- Las claves de acceso y la IP fija (si el DTPM la exige) viven en el servidor,
  que es el único lugar donde pueden vivir de forma segura. **Nunca en el
  binario de la app**, donde cualquiera puede extraerlas.

Este único argumento ya justifica tener backend, incluso antes de hablar del
motor de estimación.

## 1.6 Tareas de verificación pendientes

Antes de escribir código de producto:

- [ ] Descargar el GTFS vigente y validar su contenido y frecuencia de actualización.
- [ ] **Leer y documentar la licencia de uso del GTFS**, específicamente para uso comercial/con publicidad.
- [ ] Enviar la solicitud formal al DTPM por acceso a posiciones y predictor. Documentar fecha de envío y respuesta.
- [ ] Confirmar si existe hoy algún feed GTFS-Realtime del DTPM (consultar directamente en la solicitud anterior).
- [ ] Evaluar la cobertura y calidad de los datos de Metro.
- [ ] Revisar los términos de uso de red.cl respecto al consumo automatizado.

## Fuentes consultadas

- [DTPM — GTFS vigente](https://www.dtpm.cl/index.php/noticias/gtfs-vigente)
- [DTPM — Datos y Servicios](https://www.dtpm.cl/index.php/homepage/sistema-de-transportes/datos-y-servicios)
- [Portal de Datos Abiertos — Feed GTFS Santiago](https://datos.gob.cl/dataset/33245)
- [Red Movilidad — App Red](https://www.red.cl/acerca-de-red/app-red/)
- [xorcl/api-red — API comunitaria de Red y Metro](https://github.com/xorcl/api-red)
- [muZk/red-api — wrapper de red.cl](https://github.com/muZk/red-api)
- [ignacio hermosilla — "API Transantiago para todos"](https://medium.com/@ignacio_h_v/api-transantiago-para-todos-8a28b9074b0a)
- [Especificación GTFS Realtime](https://gtfs.org/es/realtime/best-practices/)
