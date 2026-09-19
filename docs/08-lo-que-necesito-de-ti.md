# 08 — Lo que necesito de ti

Todo lo que no puedo decidir ni hacer yo. Está ordenado por urgencia: el bloque A
**bloquea el avance ahora mismo**; los demás se pueden ir respondiendo de a poco.

**Cómo responder:** edita este archivo rellenando los espacios, o simplemente
contéstame en el chat por número. No hace falta responder todo de una vez.

---

# BLOQUE A — Bloquea el avance ahora

## A1 · Bajar el feed GTFS real 🔴

**Por qué te toca a ti:** el entorno donde trabajo tiene bloqueado el acceso a
`dtpm.cl`, `datos.gob.cl` y `transitfeeds.com` por política de red. Ya está todo
el código escrito y probado; sólo falta el archivo.

```bash
cd backend
pip install -r requirements.txt
python -m gtfs.cli descargar                 # o bájalo a mano desde dtpm.cl
python -m gtfs.cli validar data/GTFS.zip     # esto es lo que necesito ver
```

**Pégame la salida del comando `validar`.** Con eso sé si el feed real sirve, qué
tan sucio viene y qué hay que ajustar. Si la descarga automática falla, baja el
zip a mano y pásale la ruta.

- [ ] Hecho — salida pegada

## A2 · Solicitud de acceso al DTPM 🔴

Lo más lento de todo el proyecto. **Cada semana que pase sin enviarla es una
semana de retraso**, y no se recupera trabajando más horas.

Hay que escribir al DTPM pidiendo acceso a los servicios de **posición de
vehículos y predicción de llegada**, explicando el uso previsto.

- [ ] Enviada — fecha: `________`
- [ ] Respuesta recibida — fecha: `________`
- [ ] ¿Piden IP fija? `SÍ / NO` (condiciona el hosting)

> ¿Quieres que te redacte el correo? Dime y lo escribo.

## A3 · Prueba de terreno: grabar viajes en micro 🔴

**La validación más barata del supuesto más caro del proyecto.** Todo el producto
asume que una traza GPS permite saber en qué recorrido va alguien. Eso todavía no
está verificado.

Qué hacer: instala cualquier app de registro GPS (GPX Logger, Geo Tracker,
OpenTracks — gratis), y graba:

| # | Qué grabar | Para qué |
|---|---|---|
| 1 | 3–4 viajes completos en micro, distintas líneas | La traza base |
| 2 | 1 viaje en auto por la misma calle que una micro | ¿Se distinguen? |
| 3 | 1 viaje por un corredor con muchas líneas (Alameda, Providencia) | El caso difícil |
| 4 | 1 viaje en Metro | Confirmar que el GPS se corta |

Anota en cada uno: **qué línea era y a qué hora**. Súbelos a `datos/trazas/` del
repositorio y los analizo.

- [ ] Grabadas y subidas

## A4 · Decidir el stack 🔴

Sin esto no puedo escribir la app. Las cuatro preguntas, de `02` §2.5:

| # | Pregunta | Tu respuesta |
|---|---|---|
| 1 | ¿Es un producto o un proyecto para aprender iOS? | `__________` |
| 2 | ¿Android entra en fase 2, o se descarta? | `__________` |
| 3 | ¿Con qué lenguaje estás más cómodo: Dart, TypeScript o Swift? | `__________` |
| 4 | ¿Presupuesto para mapas, o priorizamos open source? | `__________` |

*(Mi recomendación sigue siendo Flutter, ver `02` §2.3. Pero si la respuesta 1 es
"quiero aprender iOS", la recomendación cambia a Swift nativo y está bien.)*

---

# BLOQUE B — Identidad y estilo

Esto es lo que me pediste: **cómo quieres que se vea y se sienta la app.** No
necesito respuestas de diseñador, sólo tus preferencias.

## B1 · Nombre 🟠

"Bus Checker" choca con *Transantiago Bus Checker*, una app existente que tú
mismo citaste como referente. Riesgo de confusión y de rechazo en tiendas.

- Nombre elegido: `______________________`
- [ ] Verificado que no existe en App Store
- [ ] Verificado que no existe en Play Store
- [ ] Dominio disponible

## B2 · Tono de voz

Cómo te habla la app. Marca una opción de cada fila:

| | Opción A | Opción B | Tu elección |
|---|---|---|---|
| Trato | «tu micro llega en 4 min» (tú) | «su bus llega en 4 min» (usted) | `___` |
| Vocabulario | **micro**, paradero, bip (chileno) | bus, parada, tarjeta (neutro) | `___` |
| Registro | Seco y directo: «La 506 no viene» | Amable: «Parece que la 506 no pasará» | `___` |

*Mi sugerencia: tú + chileno + directo.* La app se usa apurado en la calle; el
vocabulario local genera confianza y la brevedad se agradece. Pero es tu producto.

## B3 · Color

La app necesita **cuatro colores de estado** que se entiendan de un vistazo, y
un color de marca. Los estados son casi obligatorios (verde = confiable, ámbar =
ojo, rojo = no viene, gris = sin datos); donde hay libertad real es en la marca.

- Color principal de marca: `______________` *(nombre o código hex; o «elige tú»)*
- ¿Algún color que **no** quieras? `______________` *(ej. evitar el rojo de Red)*

⚠️ **Un cuidado importante:** el rojo y el verde no se distinguen para cerca del
8% de los hombres. Como el estado es la información central del producto, **nunca
puede depender sólo del color**: siempre irá acompañado de texto o ícono. Eso ya
está así en el prototipo.

## B4 · Referencias visuales

Lo más útil que me puedes dar. **Nombra 2 o 3 apps que te gusten estéticamente**
—de cualquier rubro, no tienen que ser de transporte— y qué te gusta de ellas.

1. `______________________` porque `______________________`
2. `______________________` porque `______________________`
3. `______________________` porque `______________________`

¿Alguna app que te parezca fea o incómoda, para evitar ese camino?
`______________________`

## B5 · Densidad de información

| Opción | Qué significa |
|---|---|
| **Mínima** | Sólo la próxima micro, número gigante. Un vistazo y listo. |
| **Media** | 3–4 líneas con ETA, rango y confianza. *(Es lo que hice en el prototipo.)* |
| **Alta** | Todo: rangos, confianza, cuántos a bordo, últimas llegadas. |

Tu elección: `______________`

## B6 · Modo oscuro

- [ ] Sí, obligatorio *(recomendado: mucha gente usa la micro de noche)*
- [ ] Sólo claro, por ahora

## B7 · Tipografía e ícono

- Tipografía: `______________` *(o «la del sistema», que es lo más rápido y se ve nativo)*
- Ícono de la app: ¿tienes idea, o lo propongo yo? `______________`

## B8 · El prototipo

Ya lo viste. **¿Qué cambiarías?** Es más útil que cualquier respuesta anterior.

```
____________________________________________________________
____________________________________________________________
```

Tres decisiones que tomé y quiero que confirmes o rechaces:

| # | Decisión | ¿De acuerdo? |
|---|---|---|
| 1 | Mostrar rango (`3–6 min`) además del número | `SÍ / NO` |
| 2 | Mostrar «3 personas a bordo» para explicar la confianza | `SÍ / NO` |
| 3 | «No va a llegar» siempre con una alternativa concreta | `SÍ / NO` |

---

# BLOQUE C — Cuentas, costos y trámites

Nada de esto lo puedo hacer yo: requiere tu identidad y tu tarjeta.

## C1 · Cuentas de desarrollador

| Cuenta | Costo | Cuándo | Necesaria para |
|---|---|---|---|
| **Apple Developer Program** | USD 99 / año | Antes de probar en iPhone real | TestFlight, App Store, **Apple Watch** |
| **Google Play Console** | USD 25 (pago único) | Antes de publicar en Android | Play Store |

- [ ] Apple — contratada
- [ ] Google Play — contratada

> Si el presupuesto aprieta, **empieza por Google Play**: es 4 veces más barata,
> la revisión es menos estricta y es donde está la mayoría del mercado chileno.

## C2 · Infraestructura

| Concepto | Costo mensual estimado |
|---|---|
| Servidor + base de datos (fase 1) | USD 20–50 |
| Teselas de mapa | USD 0 (MapLibre) a 200+ (Google Maps) |
| Dominio | ~USD 12 / año |
| **Total fase 1** | **USD 25–70 / mes** |

- Presupuesto mensual que puedes sostener: `USD ______`
- [ ] Proveedor elegido: `______________`

## C3 · Entidad legal

Relevante para las tiendas, y **obligatorio** si algún día vendes datos agregados
a municipios u operadores (`07` §7.5): una persona natural no factura a un
organismo público con comodidad.

- [ ] Persona natural, por ahora
- [ ] Empresa (SpA u otra) — constituida el `________`

## C4 · Asesoría legal en privacidad

No urgente, pero **no puede llegar después** de activar la telemetría. Guardar
trayectorias de transporte público es tratar datos personales sensibles bajo la
Ley 19.628 y su reforma.

- [ ] Contactada — antes de la fase 2

---

# BLOQUE D — Textos que sólo tú puedes aprobar

Te dejo borradores listos. Sólo necesito que los apruebes o los corrijas.

## D1 · Permiso de ubicación (mientras se usa la app)

> **Borrador:** «Bus Checker usa tu ubicación para mostrarte los paraderos que
> tienes cerca y cuánto falta para que llegue tu micro.»

- [ ] Aprobado  · Cambios: `______________________`

## D2 · Permiso de ubicación en segundo plano (fase 2)

Este es el texto delicado: **de él depende que Apple apruebe la app** y que la
gente acepte el permiso.

> **Borrador:** «Si lo activas, Bus Checker usa tu ubicación mientras viajas para
> saber dónde van realmente las micros. Así podemos avisarte cuándo llega la tuya
> —y cuándo no va a llegar. Tus datos se guardan de forma anónima, nunca se
> asocian a tu identidad, y puedes desactivarlo cuando quieras.»

- [ ] Aprobado  · Cambios: `______________________`

## D3 · Política de privacidad y términos de uso

Obligatorios para publicar en ambas tiendas. Puedo redactar un borrador completo
a partir de las reglas de `03` §3.7 y `07` §7.5, pero **debe revisarlo un
abogado** antes de publicarse.

- [ ] Quiero que redactes el borrador
- [ ] Revisado por abogado

---

# BLOQUE E — Decisiones de producto pendientes

De `06` §6.2. Ninguna bloquea hoy, pero todas llegan pronto.

| # | Decisión | Tu respuesta |
|---|---|---|
| D9 | **Zona de lanzamiento.** ¿Qué comuna o corredor? Es la decisión estratégica más importante: define si el motor alcanza densidad (`04` §4.7) | `__________` |
| D10 | ¿Los reportes manuales entran al producto, o es 100% pasivo? Descartarlos simplifica mucho | `__________` |
| D11 | Ambigüedad de línea: ¿100% automático, o confirmación de un toque? | `__________` |
| — | ¿Wear OS además de Apple Watch? | `__________` |
| — | ¿Publicas datos agregados abiertamente? (`07` §7.5 — lo recomiendo) | `__________` |

---

# Si sólo puedes hacer tres cosas esta semana

1. **A1** — bajar el GTFS y pegarme la salida de `validar`. Me desbloquea de inmediato.
2. **A2** — enviar la solicitud al DTPM. Es lo único que no se acelera con esfuerzo.
3. **A4** — decidir el stack. Sin eso no puedo empezar la app.

El bloque B (estilo) puede esperar, pero **B4 —las apps que te gustan— es lo que
más me sirve** y toma dos minutos.
