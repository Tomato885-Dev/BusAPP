# 13 — La solicitud al DTPM

El único camino legítimo hacia «dónde está el bus ahora» es el DTPM. Con la
decisión D12 (`06`) no hay alternativa comunitaria: **esta solicitud es el
proyecto completo esperando en un trámite.**

- [x] **Enviada el:** `20 / 09 / 2026` ✅
- [ ] **Acuse de recibo:** `____ / ____ / 2026`
- [ ] **Respuesta:** `____ / ____ / 2026`

> **Enviada con el formulario adjunto**, marcando los dos servicios. Si al
> **10 de octubre** no hay respuesta ni acuse de recibo, corresponde insistir
> por teléfono; y desde la tercera o cuarta semana, la vía de Transparencia
> (§6).

---

## 1. Qué se manda

Son **dos cosas en un solo correo**:

1. El **«Formulario de registro para uso de datos y/o servicios»** del DTPM,
   lleno y adjunto.
2. Un **correo de presentación** que explique quién eres y para qué. El
   formulario no tiene espacio para eso, y es lo que hace que una solicitud se
   lea en vez de archivarse.

El destinatario es la dirección que el DTPM publica en su página «Datos y
Servicios». *(Desde el entorno de desarrollo no puedo abrir `dtpm.cl`, así que
esa dirección la copia él de la página, no la invento acá.)*

---

## 2. Lo que el formulario revela, y que cambia la solicitud

**El formulario ofrece sólo dos servicios**, con una casilla cada uno:

| Servicio | Qué entrega |
|---|---|
| **Web Service de Posicionamiento** | Posición de **todos** los buses en circulación, con o sin servicio asignado |
| **Web Service de Alertas** | Alertas generadas por las flotas |

**No hay servicio de predicción de llegada en la lista.** Es un hallazgo
importante y hay que asumirlo: el DTPM entrega la **posición cruda**, y el
«¿en cuántos minutos llega?» hay que calcularlo. Esto no es una mala noticia:

- La posición cruda es **mejor** que la predicción ajena para lo que hace
  Kupay, porque el producto no promete un minuto exacto sino responder *si
  viene*. Con posiciones se puede decir «hay un 506 a tres cuadras y avanzando»,
  que es la respuesta real.
- El motor de estimación ya está diseñado para trabajar así (`04`).
- Y significa que el ETA es **nuestro**, no una cifra prestada que hay que
  repetir aunque esté mal.

Se marcan **las dos casillas**. Las alertas de flota son exactamente lo que
permite decir «esta micro no viene» con fundamento, que es la frase que da
origen al producto.

La predicción se pregunta en el correo, como pregunta y no como supuesto.

### Dos campos que hay que resolver antes de mandarlo

**«IP Origen».** El servicio se consume desde un servidor, nunca desde la app
(`01` §1.5: las credenciales en el binario de la app las extrae cualquiera).
Ese servidor todavía no existe. Se pone **«Por definir; se registrará antes del
paso a producción»** y se explica en el correo. Para producción habrá que
arrendar una máquina con IP fija — unos USD 5 al mes, que caben de sobra en el
presupuesto (`06`).

**«N° estimado de consultas diarias».** La respuesta correcta es la que
demuestra que no se les va a golpear el servicio: **una consulta cada 30
segundos desde un único servidor, ≈ 2.900 al día, independiente de cuántos
usuarios tenga la app.** Ese número no crece con los usuarios, y decirlo así
responde por adelantado la pregunta que cualquiera se haría al leer «modelo de
negocio: suscripción».

---

## 3. Cómo se llena el formulario

> ⚠️ El archivo descargado trae texto de prueba en **Contacto Técnico →
> Nombre** (`hasdbajs`). Borrarlo antes de mandarlo.

### Información Solicitante

| Campo | Qué poner |
|---|---|
| Nombre o Razón social | Tu nombre completo *(ver §5 sobre la edad)* |
| RUT | El tuyo |
| Teléfono | El tuyo |
| Correo electrónico | El mismo desde el que mandas el correo |
| Dirección | Tu domicilio |

### Contacto Administrativo y Contacto Técnico

Los dos eres tú. En **Cargo**: `Responsable del proyecto` en el
administrativo, `Desarrollador` en el técnico.

### Datos Aplicación

| Campo | Qué poner |
|---|---|
| Nombre | `Kupay` |
| IP Origen | `Por definir; se registrará antes del paso a producción` |
| Sitio Web | `https://tomato885-dev.github.io/BusAPP` |
| Descripción | `Aplicación de información a pasajeros para la Región Metropolitana. Muestra los paraderos cercanos y el tiempo de llegada de los servicios, y permite planificar viajes con combinación. Hoy funciona con el GTFS estático publicado por el DTPM.` |
| Plataforma | `iOS y Android (aplicación nativa), con versión web` |
| Público objetivo | `Usuarios del transporte público de la Región Metropolitana` |
| N° de usuarios actuales | `0 — aplicación en desarrollo, con una versión de prueba pública sin usuarios registrados` |
| Crecimiento estimado de usuarios | `Lanzamiento acotado a una zona de la ciudad. Del orden de cientos de usuarios en los primeros seis meses.` |
| N° estimado de consultas diarias | `≈ 2.900 (una consulta cada 30 segundos desde un único servidor). No aumenta con el número de usuarios: la aplicación no consume el servicio directamente.` |
| N° de visitas diarias | `Proyectadas del orden de 300 a seis meses del lanzamiento.` |
| Tiempo medio de la visita | `Menos de un minuto. La aplicación está diseñada para responder sin que haya que navegar por ella.` |
| Modelo de negocio (breve) | `Aplicación gratuita. Consultar el tiempo de llegada en un paradero es, y seguirá siendo, gratuito. Se cobra una suscripción opcional por funciones de conveniencia (avisos automáticos y rutinas guardadas). No se contempla la reventa ni la cesión a terceros de los datos del Sistema.` |

### Servicios y/o Datos

☑ Web Service de Posicionamiento  ☑ Web Service de Alertas

---

## 4. El correo

**Asunto:** Solicitud de acceso a Web Service de Posicionamiento y Alertas — aplicación de información a pasajeros

Estimados señores del Directorio de Transporte Público Metropolitano:

Junto con saludar, adjunto el **Formulario de registro para uso de datos y/o
servicios** solicitando acceso al **Web Service de Posicionamiento** y al
**Web Service de Alertas**.

Me presento brevemente, porque el formulario no tiene espacio para hacerlo.

Soy ⟨nombre completo⟩, estudiante, tengo 17 años y vivo en Santiago. Estoy
desarrollando *Kupay*, una aplicación de información a pasajeros para la Región
Metropolitana. La idea nació de algo que me pasa a mí y le pasa a todo el que se
mueve en micro: uno no sabe si el bus que está esperando va a llegar. Saber que
pasa cada diez minutos no sirve cuando el que correspondía ya no viene.

Hoy la aplicación funciona sólo con el **GTFS estático** que ustedes publican.
Con eso puede mostrar los paraderos, los recorridos, los trazados y las
frecuencias programadas, y ya está publicada como versión de prueba en
`https://tomato885-dev.github.io/BusAPP`. Pero con horarios programados no se
puede responder la única pregunta que importa cuando uno está parado en el
paradero, y por eso escribo: **necesito la posición real de la flota.**

Quiero ser explícito en dos cosas, para que la evaluación se haga sobre
información completa.

**Es un proyecto con fines comerciales.** La aplicación contempla una
suscripción opcional. Consultar cuándo llega la micro en un paradero será y se
mantendrá **gratuito**; lo que se cobra son funciones de conveniencia —avisos
automáticos, rutinas guardadas—. No se contempla la reventa de los datos del
Sistema ni su entrega a terceros.

**El servicio no se consumiría desde los teléfonos.** Las consultas las haría un
único servidor, a razón de una cada 30 segundos, y desde ahí se distribuye a la
aplicación. El volumen no crece con el número de usuarios, y las credenciales no
viajan nunca dentro de la aplicación. Ese servidor todavía no está contratado, y
por eso el campo «IP Origen» del formulario va por definir: comprometo
informar la IP pública fija antes de cualquier paso a producción.

Junto con lo anterior, quisiera consultar tres cosas:

1. Si existe, o se proyecta, un servicio de **predicción de llegada a paradero**
   además de los dos del formulario, o si el cálculo del tiempo de llegada queda
   por cuenta de quien consume el posicionamiento.
2. Si el DTPM publica o proyecta publicar un feed **GTFS-Realtime**
   (`VehiclePositions`, `TripUpdates`), estándar que la aplicación ya utiliza
   para el GTFS estático.
3. Las **condiciones de uso y licencia** aplicables a estos servicios y al
   **GTFS estático**, con precisión respecto del **uso comercial**, la
   atribución exigida y las restricciones de redistribución. Prefiero ajustarme
   a ellas desde el inicio antes que tener que corregir después.

Por mi edad, si el procedimiento requiere suscribir un convenio o acuerdo de
uso, puedo comparecer representado por ⟨nombre del apoderado⟩, ⟨parentesco⟩,
quien figuraría como titular si así lo estiman necesario. Quedo atento a lo que
corresponda.

Agradezco de antemano su tiempo. Sé que la información que pido es la más
sensible que administran, y estoy disponible para completar cualquier
antecedente adicional, suscribir los acuerdos que estimen necesarios o exponer
el proyecto si resulta útil para la evaluación.

Atentamente,

⟨nombre completo⟩
⟨correo⟩ — ⟨teléfono⟩
⟨fecha⟩

---

## 5. Por qué está escrita así

**Dice la edad, en el tercer párrafo.** Es la decisión más discutible del texto
y es deliberada. El RUT va en el formulario, así que la edad se sabe igual: no
decirla no la esconde, sólo hace que la descubran después. Dicha de frente
explica el «0 usuarios» sin que parezca un proyecto abandonado, y hace que la
solicitud se lea. Lo que **no** puede hacer es quedar sola, porque «estudiante
de 17 años» leído sin contexto se archiva como tarea del colegio. Por eso en el
mismo correo va el GTFS ya procesado, la versión publicada, la arquitectura de
consumo y el modelo de negocio: la edad es un dato, no la explicación del
proyecto.

**Dice que es comercial.** Omitirlo sería obtener el acceso sobre una
declaración falsa, y dejaría un permiso revocable el día en que la app aparezca
cobrando — justo el día en que ya no se podría prescindir de él.

**Separa lo gratis de lo pagado**, que es la regla del producto (`11`) y además
la respuesta a la objeción natural de un organismo público: que un dato del
Estado termine detrás de un muro de pago. No termina.

**Ofrece el apoderado antes de que lo pidan.** En Chile un menor de 18 tiene
capacidad limitada para obligarse. Si el acceso requiere firmar algo, eso va a
aparecer; mencionarlo primero convierte un problema en un trámite resuelto.

**Explica la arquitectura de consumo sin que la pregunten.** «Una consulta cada
30 segundos desde un servidor, no desde los teléfonos» responde por adelantado
el miedo real de quien administra un servicio: que alguien lo sature o filtre
las credenciales.

**No promete nada que no se pueda cumplir**: ni usuarios, ni fechas, ni
convenios. Sólo disposición.

---

## 6. Si no responden

Tras tres o cuatro semanas sin respuesta, existe un segundo canal **con plazo
legal**: la Ley 20.285 de Transparencia.

> https://www.portaltransparencia.cl → *Solicitud de acceso a la información* →
> organismo: **Ministerio de Transportes y Telecomunicaciones**

El organismo debe responder por escrito en **20 días hábiles**.

Diferencia importante, para no ilusionarse: Transparencia obliga a entregar
**información**, no necesariamente a abrir un **servicio**. Pueden responder con
datos en un archivo y no con credenciales. Aun así sirve: obliga a una respuesta
escrita, deja constancia de la fecha, y una negativa se puede reclamar ante el
Consejo para la Transparencia.

**El orden correcto es primero el correo normal.** Empezar por la vía formal con
un organismo que atiende por correo es una forma innecesaria de empezar mal.

---

## 7. Mientras tanto

Mandar esto no desbloquea nada hoy: la respuesta tarda semanas. Lo que sí se
puede adelantar en paralelo, y no depende de nadie más, es la **telemetría
propia** (`01` §1.4) — que descansa entera en un supuesto todavía sin probar, y
que sólo se prueba con las trazas GPS de `10-prueba-de-terreno.md`.

La carta y las trazas son las dos únicas tareas del proyecto que el código no
puede hacer por sí solo.
