# 13 — La solicitud al DTPM

El único camino legítimo hacia «dónde está el bus ahora» es el DTPM. Con la
decisión D12 (`06`) no hay alternativa comunitaria: **esta carta es el proyecto
completo esperando en un trámite.**

Por eso hay una sola métrica que importa en este documento: la fecha de envío.

- [ ] **Enviada el:** `____ / ____ / 2026`
- [ ] **Acuse de recibo:** `____ / ____ / 2026`
- [ ] **Respuesta:** `____ / ____ / 2026`

---

## 1. A quién se manda

El DTPM publica el procedimiento en su página **«Datos y Servicios»**:

> https://www.dtpm.cl/index.php/homepage/sistema-de-transportes/datos-y-servicios

Lo que ahí se describe es: **completar un formulario indicando el uso que se
dará a la información y enviarlo por correo**. Entregan las credenciales del
ambiente de desarrollo por correo dentro de unos diez días hábiles, válidas por
dos meses, junto con la documentación técnica. Para el ambiente de producción
piden **registrar la IP pública** desde donde se consumirá el servicio.

> ⚠️ **La dirección de correo exacta hay que sacarla de esa página.** Está
> publicada ahí, pero el sitio la ofusca contra el *spam*, y desde acá no puedo
> abrir `dtpm.cl` (la red de este entorno lo bloquea). **No la inventes ni la
> adivines**: ábrela en el navegador, cópiala, y si además hay un formulario
> para descargar, descárgalo y adjúntalo lleno.
>
> Si la página cambió o no aparece, el respaldo es el teléfono:
> **+56 2 2421 3000, anexo 8511** — Agustinas 1382, Santiago. Una llamada de dos
> minutos preguntando «¿a qué correo mando una solicitud de acceso a los
> servicios de posicionamiento y predicción?» resuelve esto.

### Si no responden: la vía formal

Existe un segundo canal, y **tiene plazo legal**: la Ley 20.285 de Transparencia.

> https://www.portaltransparencia.cl → *Solicitud de acceso a la información* →
> organismo: **Ministerio de Transportes y Telecomunicaciones**

El organismo está obligado a responder por escrito en **20 días hábiles**.

Diferencia importante, para no ilusionarse: Transparencia obliga a entregar
**información**, no necesariamente a abrir un **servicio**. Pueden responder
con los datos en un archivo y no con credenciales de API. Aun así sirve para
tres cosas: obliga a una respuesta escrita, deja constancia de la fecha, y si
la respuesta es negativa, esa negativa se puede reclamar ante el Consejo para
la Transparencia.

**El orden correcto es: primero el correo normal; Transparencia sólo si pasan
tres o cuatro semanas sin respuesta.** Empezar por la vía formal con un
organismo que atiende bien por correo es una forma innecesaria de empezar mal.

---

## 2. La carta

Copiar de aquí hacia abajo. Lo que va entre `⟨ ⟩` hay que reemplazarlo.

---

**Asunto:** Solicitud de acceso a servicios de posicionamiento y predicción de
llegada — aplicación de información a pasajeros

Estimados señores del Directorio de Transporte Público Metropolitano:

Junto con saludar, escribo para solicitar acceso a los servicios de
**posicionamiento de flota** y **predicción de llegada a paradero** del Sistema
de Transporte Público Metropolitano, de acuerdo con el procedimiento publicado
en la sección «Datos y Servicios» del sitio del DTPM.

**Quién solicita**

- Nombre: ⟨nombre completo⟩
- RUT: ⟨RUT⟩
- Correo: ⟨correo⟩
- Teléfono: ⟨teléfono⟩
- Calidad: ⟨persona natural / estudiante de ⟨carrera⟩ en ⟨universidad⟩⟩

**Uso previsto de la información**

Estoy desarrollando *Kupay*, una aplicación móvil de información a pasajeros
para la Región Metropolitana. Su propósito es resolver un problema concreto y
cotidiano del usuario del sistema: no saber si el bus que espera efectivamente
va a llegar.

Hoy la aplicación funciona únicamente con el **GTFS estático** publicado por el
DTPM, lo que permite mostrar paraderos, recorridos, trazados y frecuencias
programadas. Con eso la aplicación puede decir cada cuánto pasa un servicio,
pero no puede decir si el próximo bus viene en camino, que es exactamente la
información que el pasajero necesita para decidir si espera, si camina al
siguiente paradero o si toma otra alternativa.

Declaro desde ya, para que la evaluación se haga sobre información completa,
que **se trata de un proyecto con fines comerciales**: la aplicación contempla
funciones de pago. La consulta de tiempos de llegada en un paradero será y se
mantendrá **gratuita**; lo que se cobra son funciones de conveniencia
(avisos automáticos, rutinas guardadas y similares). No se contempla la reventa
de los datos crudos del Sistema ni su entrega a terceros.

**Lo que se solicita**

1. Acceso a los servicios de **posición de vehículos** y **predicción de
   llegada a paradero**, en ambiente de desarrollo y posteriormente de
   producción, con su documentación técnica.
2. Confirmación de si el DTPM publica o proyecta publicar un feed
   **GTFS-Realtime** (`VehiclePositions`, `TripUpdates`), estándar que ya
   utiliza la aplicación para el GTFS estático.
3. Las **condiciones de uso y licencia** aplicables tanto a estos servicios
   como al **GTFS estático**, con precisión respecto del **uso comercial**, la
   atribución exigida y cualquier restricción de redistribución. Esta
   información es determinante para el diseño del producto, y prefiero
   ajustarme a ella desde el inicio antes que corregir después.
4. Los **requisitos técnicos y administrativos** que deba cumplir: registro de
   IP pública fija, límites de consulta, convenios o acuerdos de uso que deba
   suscribir, y cualquier antecedente adicional que corresponda acompañar.

Quedo a disposición para completar los formularios que corresponda, suscribir
los acuerdos de uso que el Directorio estime necesarios, o exponer el proyecto
en una reunión si resulta útil para la evaluación.

Agradeciendo de antemano su tiempo y su disposición,

⟨nombre completo⟩
⟨correo⟩ — ⟨teléfono⟩
⟨fecha⟩

---

## 3. Por qué está escrita así

**Dice que es comercial, en el tercer párrafo y no escondido al final.** Es la
decisión que más se podría discutir, y es deliberada. Omitirlo sería obtener el
acceso sobre una declaración falsa: quedaría un permiso revocable el día en que
la app aparezca cobrando en la tienda — justo el día en que ya no se puede
prescindir de él. Además, el DTPM entrega datos a operadores y a empresas de
tecnología; lo comercial no es descalificante ahí, y decirlo de frente antes de
que lo pregunten es lo que hace creíble todo lo demás.

**Separa lo gratis de lo pagado.** «Ver cuándo llega la micro es gratis» es la
regla del producto (`11`) y también la respuesta a la objeción natural de un
organismo público: que un dato del Estado termine detrás de un muro de pago.
No termina.

**Pide la licencia explícitamente.** Es el punto 3 y no una nota al pie, porque
es el supuesto bloqueante del proyecto (`06` §6.3, supuesto 2). Si el GTFS no
admite uso comercial, eso hay que saberlo ahora.

**Menciona GTFS-Realtime por su nombre.** Señala que del otro lado hay alguien
que sabe de qué habla, y abre la posibilidad de que la respuesta sea mucho
mejor que la pregunta.

**No promete nada que no se pueda cumplir**: ni usuarios, ni fechas de
lanzamiento, ni convenios. Sólo disposición.

---

## 4. Mientras tanto

Enviar esto no desbloquea nada hoy: la respuesta tarda semanas. Lo que sí se
puede adelantar en paralelo, y no depende de nadie más, es la **telemetría
propia** (`01` §1.4) — que descansa entera en un supuesto todavía sin probar, y
que sólo se prueba con las trazas GPS de `10-prueba-de-terreno.md`.

Dicho de otro modo: la carta y las trazas son las dos únicas tareas del
proyecto que el código no puede hacer por sí solo.
