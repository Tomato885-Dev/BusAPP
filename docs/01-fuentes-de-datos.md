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

### Posiciones GPS de la flota — **obtenidas** ✅ *(9 de octubre de 2026)*

Era el bloqueador del proyecto. Dejó de serlo.

El DTPM entrega el posicionamiento de **toda la flota** y las alertas de los
operadores, por solicitud formal, con usuario y contraseña. El trámite tomó 19
días. El detalle está en `15-servicio-de-posiciones.md`.

**Qué habilita:** la promesa central del producto —saber si una micro viene o no
viene— desde el primer día y con un solo usuario, sin esperar a tener una masa
de gente aportando telemetría.

**Qué no entrega:** predicción de llegada. El DTPM da la **posición cruda**; el
tiempo de llegada lo calcula Kupay (`04`). Existe además un predictor oficial en
`red.cl`, que es otro trámite y requiere IP fija; no es urgente, y el ETA propio
tiene la ventaja de que se puede medir y corregir.

**Qué falta por saber:** el formato exacto, cada cuánto se actualiza, si reporta
la flota completa, y si sus identificadores de recorrido coinciden con los del
GTFS estático.

> ⚠️ Las credenciales **no van en este repositorio ni en la app**: viven en las
> variables de entorno del servidor. El repositorio es público y el binario de
> una aplicación lo abre cualquiera.

### APIs comunitarias — **descartadas** ❌

Hay envoltorios mantenidos por la comunidad (por ejemplo `api.xor.cl/red/...`,
`muZk/red-api`) que obtienen información de llegadas por paradero, estado del
Metro y saldo Bip! consultando el sitio oficial de Red.

**Kupay no los usa. Ni en producción ni para prototipar.**

La razón no es técnica sino de producto: Kupay es un producto comercial
(`CLAUDE.md`, regla 1). Una app que cobra no puede apoyarse en algo que no
controla ni puede exigir.

| Problema | Consecuencia |
|---|---|
| Obtienen los datos por *scraping* del sitio oficial | Un rediseño de red.cl rompe la app sin aviso |
| Sin SLA, sin garantía de disponibilidad | La app se cae cuando se cae un tercero |
| Sin límites de uso documentados | Bloqueo al crecer el tráfico, justo cuando más duele |
| Situación legal ambigua frente a los términos de uso de la fuente | Riesgo al cobrar y al publicar en las tiendas |
| No entregan posiciones GPS ni el modelo de predicción | Tampoco resuelven el problema central |

El argumento de «úsalo mientras tanto» se consideró y se rechazó: lo provisorio
se queda. Construir la app contra esa forma de datos crea dependencias que
después hay que desarmar, y mientras tanto quita urgencia a la única gestión
que sí destraba el proyecto —la solicitud al DTPM—, que es lenta y por eso no
admite postergación. Ver `docs/13-carta-dtpm.md`.

## 1.3 Qué significa esto para el producto

El brief propone combinar (a) datos oficiales de posición y (b) información de
usuarios. Si (a) no está disponible, el producto se apoya sólo en (b) y en
horarios programados. Eso cambia la propuesta de valor:

Este apartado describía tres escenarios y la estrategia para salir del peor.
**Se resolvió a favor del mejor el 9 de octubre de 2026**, y queda la nota
porque la conclusión sigue valiendo.

| Escenario | Qué puede prometer Kupay | |
|---|---|---|
| **A. Con acceso oficial a GPS** | «Esta micro está a 3 cuadras y viene hacia acá», y sobre todo: **no viene ninguna** | ✅ **es el actual** |
| **B. Sin acceso oficial, con telemetría propia** | Lo mismo, deducido de los usuarios a bordo. Depende de densidad local (`04` §4.7) | pasa a ser mejora, no cimiento |
| **C. Sin acceso oficial y sin usuarios** | Horarios programados y mapas: una app más | superado |

La estrategia era salir de C lo antes posible, y el camino que lo logró fue el
administrativo y no el técnico: **la carta al DTPM.** Vale anotarlo porque
durante meses pareció la tarea menos importante del proyecto, justamente porque
no era programar.

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
- Cuando llegue el acceso oficial del DTPM, sólo cambia un adaptador en el
  servidor; nadie tiene que actualizar la app.
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
- [ ] Confirmar por escrito que el GTFS admite uso **comercial** (es la condición para construir encima).

## Fuentes consultadas

- [DTPM — GTFS vigente](https://www.dtpm.cl/index.php/noticias/gtfs-vigente)
- [DTPM — Datos y Servicios](https://www.dtpm.cl/index.php/homepage/sistema-de-transportes/datos-y-servicios)
- [Portal de Datos Abiertos — Feed GTFS Santiago](https://datos.gob.cl/dataset/33245)
- [Red Movilidad — App Red](https://www.red.cl/acerca-de-red/app-red/)
- [ignacio hermosilla — "API Transantiago para todos"](https://medium.com/@ignacio_h_v/api-transantiago-para-todos-8a28b9074b0a)
- [Especificación GTFS Realtime](https://gtfs.org/es/realtime/best-practices/)
