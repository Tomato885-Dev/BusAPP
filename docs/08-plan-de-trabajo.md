# 08 — Plan de trabajo

Qué está hecho, qué sigue, y quién hace cada cosa.

**Este documento se actualiza.** Es la lista viva del proyecto: cuando algo se
termina, se marca y se pasa al siguiente.

- 🧑 = lo haces tú *(necesita tu identidad, tu tarjeta o tu decisión)*
- 🤖 = lo hago yo *(código)*

---

## Lo que ya está funcionando

| | |
|---|---|
| ✅ | **Documentación completa** — 9 documentos: producto, arquitectura, motor, negocio |
| ✅ | **App** con mapa, llegadas por paradero, planificador de viajes y favoritos |
| ✅ | **Publicada en internet** → tomato885-dev.github.io/BusAPP |
| ✅ | **Datos reales del DTPM** — 12.880 paraderos, 427 recorridos, frecuencias oficiales |
| ✅ | **Ingesta del feed** con 39 pruebas automáticas |
| ✅ | **Servidor Supabase** con la red cargada y verificada |

**Gasto hasta ahora: CLP 0.**

---

# BLOQUE 1 — Esta semana

> **Las cinco cosas que están esperándote a ti.** Ninguna la puedo hacer yo:
> tres necesitan tu sesión iniciada en algún sitio, una necesita tu teléfono en
> la calle y una necesita tu nombre al pie de una carta.

| | Qué | Dónde | Cuánto toma |
|---|---|---|---|
| 1.1 | Grabar 3 viajes en micro | Tu teléfono | 2 h repartidas |
| 1.2 | Volver a correr `esquema.sql` | Supabase | 2 min |
| 1.3 | Activar el inicio de sesión anónimo | Supabase | 1 min |
| 1.4 | Mandar la carta al DTPM | Tu correo | 15 min |
| 1.5 | Guardar la clave de Stadia | GitHub | 10 min |

## 1.1 🧑 Grabar viajes en micro ⭐ LO MÁS IMPORTANTE

Todo el proyecto descansa en un supuesto **que nunca hemos probado**: que una
traza de GPS permite saber en qué micro va una persona.

Si eso falla, no hay telemetría, no hay detector de desvíos, no hay
diferenciador y no hay dato que vender. **Es la única tarea que puede hundir el
proyecto, y es la única que sigue pendiente.**

**Qué hacer:**

1. Instala una app de registro GPS. Gratis: *Geo Tracker*, *OpenTracks* o
   *GPX Logger*.
2. Graba estos viajes, anotando **qué línea** y **a qué hora**:

| # | Viaje | Para qué |
|---|---|---|
| 1 | 3 viajes en micro, líneas distintas | La traza base |
| 2 | 1 viaje en auto por la misma calle que una micro | ¿Se distinguen? |
| 3 | 1 viaje por Alameda o Providencia | El caso difícil: muchas líneas juntas |
| 4 | 1 viaje en Metro | Confirmar que el GPS se corta bajo tierra |

Los tres primeros de la tabla son suficientes para empezar. El protocolo
detallado —cuándo apretar el botón, qué anotar— está en `10-prueba-de-terreno.md`.

3. Sube los archivos a `datos-terreno/` del repositorio, o mándamelos.

**Tiempo:** un par de horas repartidas en unos días.
**Cuando estén:** 🤖 los analizo y te digo si el supuesto se sostiene.

## 1.2 🧑 Volver a correr `esquema.sql` *(quedó a medias)*

La vez pasada se pegó en Supabase una **copia antigua** del archivo: entró todo
hasta la sección «5. Funciones premium» y de ahí en adelante nada. Por eso el
verificador marcó `FALTA` en `rutinas`, `consultas`, `suscripciones` y
`mis_estadisticas`.

**Qué hacer:**

1. Abre `servidor/esquema.sql` **desde GitHub** (no desde una pestaña vieja) y
   cópialo entero — son 352 líneas, la última dice `-- Fin del esquema`.
2. Supabase → **SQL Editor** → pegar → **Run**.
3. Pega y corre después `servidor/comprobar.sql`. Tiene que salir ✅ en todas
   las filas.

Está escrito para poder correrse dos veces sin romper nada (`create table if
not exists`), así que no hay riesgo en repetirlo.

## 1.3 🧑 Activar el inicio de sesión anónimo

Supabase → **Authentication** → **Sign In / Providers** → **Anonymous Sign-ins**
→ **activar el interruptor**.

Encontraste la pantalla pero faltó activarlo. Sin esto los favoritos no se
guardan en el servidor.

**Cómo saber que quedó:** en la app, pestaña Favoritos, la línea de abajo debe
decir *«Tus favoritos se guardan en el servidor»*.

## 1.4 🧑 Mandar la carta al DTPM ✅ redactada

Es el trámite más lento del proyecto — meses. **Cada semana sin enviarlo es una
semana de retraso**, y no se recupera trabajando más. Y desde que se descartaron
las fuentes comunitarias (`06` D12), es además el **único** camino oficial hacia
el dato en vivo.

**La carta está escrita y lista en `13-carta-dtpm.md`.** Lo que falta es tuyo:

1. Abrir la página «Datos y Servicios» del DTPM y **copiar de ahí la dirección
   de correo** (desde acá no puedo abrir ese sitio). Si hay un formulario para
   descargar, llenarlo y adjuntarlo.
2. Reemplazar los `⟨ ⟩` de la carta con tus datos.
3. Enviar.

- [ ] Enviado el: `________`
- [ ] Respuesta el: `________`

## 1.5 🧑 Guardar la clave de Stadia Maps

Ya no es sólo estético. Sin esta clave el mapa usa Esri, **que no tiene teselas
sobre el zoom 16**: por eso la app tiene el acercamiento limitado ahí. Con la
clave se llega a 19 y se ven los nombres de las calles chicas.

Es gratis. En el registro de la última publicación se confirma que el secreto
`STADIA_API_KEY` **sigue sin estar configurado** en GitHub.

1. Crear cuenta en `stadiamaps.com` → *Manage Properties* → crear una propiedad
   → copiar la **API key**.
2. GitHub → el repositorio → **Settings** → *Secrets and variables* → *Actions*
   → **New repository secret**.
3. Nombre exacto: `STADIA_API_KEY`. Valor: la clave.

- [ ] Clave guardada como secreto `STADIA_API_KEY` en GitHub

---

# BLOQUE 2 — Este mes

## 2.1 ✅ Decidir el nombre — **Kupay**

Hecho. *Küpay* es «viene» en mapudungun: el nombre dice literalmente lo que la
app responde. El razonamiento completo está en `09-nombre.md`.

Ya está aplicado en el código. Lo que falta es tuyo, y hay que hacerlo **antes**
de encargar un logo o difundir el proyecto:

- [ ] App Store (tienda chilena)  - [ ] Google Play
- [ ] Dominio `.cl` y `.app`      - [ ] Instagram
- [ ] **INAPI** — revisar en particular la marca **Kuapay**, una empresa de
      pagos que operó en Chile y suena casi igual
- [ ] Confirmar la traducción con una persona hablante de mapudungun

## 2.2 🧑 Definir el estilo

Lo que más me sirve, y toma dos minutos:

**Nombra 2 o 3 apps que te gusten estéticamente** (de cualquier rubro) y qué te
gusta de ellas.

1. `______________` porque `______________`
2. `______________` porque `______________`

Y el color de marca: hoy es teal apagado, elegido por la investigación de
calma. ¿Lo dejamos o prefieres otro? `______________`

> Mientras no llegue esa respuesta, la marca avanza igual: el símbolo, el
> logotipo y la tipografía están hechos y documentados en `12-identidad.md`.
> Lo que tú digas aquí ajusta el color, no hay que rehacer nada.

## 2.3 🧑 Borrar tus direcciones del historial *(privacidad)*

El repositorio es **público**. En el código de hoy no hay ninguna dirección
tuya, pero **dos commits antiguos** todavía las contienen (`c2a5f4c` y
`1dc8a1f`, con «La Capitanía 436» y «Camino Los Siervos 1280»). Quien clone el
repositorio las ve.

Limpiarlas requiere reescribir el historial, que es una operación que cambia
todos los identificadores de commit. **Es tu decisión y no la tomo solo.**
Dime «límpialo» y lo hago.

## 2.4 🤖 Widget de rutina

La función premium principal (`07` §7.4). Empiezo por la versión donde el
usuario elige su paradero y su hora; aprender la rutina sola viene después.

**Necesito de ti antes:** nada. Puedo empezar cuando digas.

## 2.5 🤖 Terminar la conexión con el servidor

Que los favoritos, el perfil y el historial vivan en Supabase de punta a punta.

**Necesito de ti:** que esté hecho el punto 1.2.

---

# BLOQUE 3 — Cuando quieras publicar

## 3.1 🧑 Cuentas de desarrollador

| Cuenta | Costo | Para qué |
|---|---|---|
| **Google Play** | USD 25, pago único | Publicar en Android |
| **Apple Developer** | USD 99 al año | Publicar en iPhone, y el widget |

> **Empieza por Google Play.** Es cuatro veces más barata, la revisión es menos
> estricta, y es donde está la mayoría del mercado chileno.

Al contratar Apple: **inscríbete en el Small Business Program**. Es la
diferencia entre que Apple se quede con 15% o con 30%.

## 3.2 🧑 Textos legales

- [ ] Política de privacidad  - [ ] Términos de uso

🤖 Te redacto los borradores. **Deben ser revisados por un abogado** antes de
publicarse: manejamos datos de ubicación.

## 3.3 🧑 Elegir la zona de lanzamiento

La decisión estratégica más importante del proyecto.

Necesitas ~5% de los pasajeros de un corredor para que el motor funcione. Eso es
alcanzable en **una comuna**, e imposible disperso en toda la región.

**Zona elegida:** `______________________`

## 3.4 🤖 Preparar la app para las tiendas

Íconos, pantalla de carga, textos de permisos, compilación firmada.

**Necesito de ti:** el nombre (2.1), el estilo (2.2) y las cuentas (3.1).

---

# BLOQUE 4 — El diferenciador *(meses 3 a 12)*

Esto es lo que hace único al producto. **Depende de que el bloque 1.1 salga
bien.**

| | Qué | Quién |
|---|---|---|
| 4.1 | Motor de inferencia de recorrido | 🤖 |
| 4.2 | Recolección de telemetría con consentimiento | 🤖 |
| 4.3 | Fusión de las dos fuentes y ETA con confianza | 🤖 |
| 4.4 | **Detección de «esta micro no viene»** | 🤖 |
| 4.5 | Ubicación en segundo plano y revisión de tiendas | 🤖 + 🧑 |
| 4.6 | Asesoría legal en privacidad | 🧑 |

---

# BLOQUE 5 — Ganar dinero *(en paralelo, desde ya)*

No esperes a terminar la app. Esto corre aparte (`07` §7.7c).

## 5.1 🧑 Hablar con compradores del dato

Un municipio tarda meses en comprar. **Si la conversación parte ahora, el
producto llega con clientes esperando.**

Por orden de facilidad: consultoras e inmobiliarias → operadores de buses →
municipios → DTPM.

- [ ] Primer contacto hecho con: `______________________`

## 5.2 🤖 Herramienta de estudios de accesibilidad

Le das una dirección y devuelve un informe: cuántas líneas la sirven, a qué
distancia está el paradero, cuánto se demora al centro.

**Es lo primero vendible del proyecto y no necesita ni un solo usuario** — el
dato ya está cargado en tu Supabase.

**Necesito de ti:** que me digas que sí. Lo construyo cuando quieras.

## 5.3 🧑 Vender un estudio

Uno solo. Prueba que alguien paga, y eso vale más que cualquier proyección.

---

# Si sólo haces tres cosas

1. **Manda la carta al DTPM** (1.4) — ya está escrita; es lo único que no se
   acelera trabajando más, y ahora es el único camino oficial al dato en vivo
2. **Graba los viajes en micro** (1.1) — responde la pregunta que puede hundir todo
3. **Vuelve a correr el `esquema.sql` y activa el anónimo** (1.2 y 1.3) — cinco
   minutos entre las dos, y desbloquean el servidor completo

---

# Lo que necesito de ti, resumido

| Cuándo | Qué |
|---|---|
| **Ahora** | Carta al DTPM · trazas GPS · `esquema.sql` · inicio de sesión anónimo · clave de Stadia |
| **Este mes** | Apps que te gusten · registrar el nombre · decidir si limpiamos el historial |
| **Al publicar** | Cuentas de tiendas · zona de lanzamiento · abogado |
| **Siempre** | Decirme qué se ve mal cuando pruebes la app |

Lo último es lo más valioso. Cada vez que abriste la app y me dijiste «esto está
raro», encontramos un error real que ni las pruebas ni el análisis detectaban.
