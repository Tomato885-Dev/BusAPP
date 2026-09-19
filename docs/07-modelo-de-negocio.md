# 07 — Modelo de negocio

> Premisa de diseño: **cero invasión al usuario.** Ninguna fuente de ingreso
> puede interrumpir, degradar la experiencia gratuita, ni traicionar la
> confianza sobre la que se sostiene la recolección de ubicación.

## 7.1 Por qué la publicidad está descartada (y no por gusto)

El brief ya planteaba "poca publicidad". El análisis técnico lleva a una
conclusión más fuerte: **la publicidad es directamente incompatible con este
producto.** Tres razones independientes.

### Razón 1 — Destruye el permiso que el producto necesita

El motor de Kupay depende de que el usuario comparta su ubicación de forma
continua. Eso sólo es aceptable si el usuario confía en que ese dato se trata con
cuidado.

Los SDK de publicidad (AdMob y equivalentes) recolectan identificadores de
dispositivo y, habitualmente, ubicación para segmentar. Integrar uno significa
que la ficha de privacidad de la app —visible en App Store y Play Store **antes**
de descargarla— pase a declarar *"datos usados para rastrearte"*.

> Estarías pidiendo permiso de ubicación permanente con una mano, mientras con la
> otra le muestras al usuario una etiqueta que dice que lo rastreas para vender
> publicidad. El permiso que sostiene todo el producto es justamente el que se
> pierde.

### Razón 2 — Los números no dan

La publicidad móvil en Chile paga poco (CPM del orden de 1 a 3 USD; cifra a
verificar con un proveedor real). Con formatos no invasivos —los únicos
aceptables aquí— el ingreso por usuario al año queda por debajo de 1 USD.

Eso implica necesitar **cientos de miles de usuarios activos sólo para cubrir la
infraestructura**. Y para llegar ahí, el producto tiene que ser excelente; si ya
lo es, hay formas mucho mejores de monetizarlo.

### Razón 3 — Contradice el momento de uso

El usuario abre esta app apurado, en la calle, muchas veces con mala señal.
Es el peor contexto posible para un anuncio, y el mejor contexto para que
desinstale.

**Conclusión: sin publicidad. No como promesa de marketing, sino como decisión
de arquitectura.**

## 7.2 El modelo propuesto: tres capas

La idea central es separar **quién usa** de **quién paga**, sin que el que usa
pierda nada.

```
   Capa 3   DATOS AGREGADOS DE MOVILIDAD  ──► el negocio
            (B2B: autoridad, operadores, municipios)
              ▲ el usuario nunca lo ve
              │
   Capa 2   SUSCRIPCIÓN PREMIUM OPCIONAL  ──► cubre los costos
            (comodidades, nunca funciones esenciales)
              ▲ el usuario decide
              │
   Capa 1   APP GRATUITA COMPLETA         ──► construye la base
            (sin anuncios, sin límites, sin cuenta obligatoria)
```

Cada capa habilita la siguiente. No se pueden saltar de orden.

---

## 7.3 Capa 1 — Gratuita y completa *(fases 0 a 3)*

Todo lo esencial es gratis y sin condiciones: llegadas, mapa, recorridos,
favoritos, planificador, estado real del servicio.

Esto no es generosidad, es estrategia: **cada usuario es un sensor.** Un usuario
que no paga igual aporta el dato que hace funcionar el producto para todos. En un
sistema de sensado distribuido, poner una barrera de entrada es sabotear tu
propia materia prima.

Costo aproximado de infraestructura en esta etapa: **50 a 200 USD/mes** (servidor,
base de datos, teselas de mapa). Financiable de forma personal mientras se valida.

---

## 7.4 Capa 2 — Premium opcional *(desde fase 4)*

**Regla innegociable:** premium sólo agrega **comodidad**, nunca información. Si
una función responde "¿cuándo llega mi micro?" o "¿va a llegar?", es gratis.
Siempre.

| Función premium | Por qué es legítimo cobrarla |
|---|---|
| **Widget de rutina** ⭐ — ver abajo | La función más vendible del producto |
| **Notificaciones inteligentes** — "sal ahora", "tu micro se desvió, anda al otro paradero" | La información está gratis; lo que se cobra es que te busque a ti en vez de que tú la busques |
| **Live Activity / Dynamic Island** — el ETA en la pantalla bloqueada | Comodidad pura, y muy vistosa |
| **Alertas de viaje recurrente** — "avísame todos los días a las 7:40 cómo está la 506" | Automatización, no información |
| **Historial personal** — cuánto esperas realmente al mes, qué línea te falla más | Dato propio, entretenido, cero impacto en quien no paga |
| **Apple Watch / Wear OS** | Comodidad de plataforma |

### ⭐ El widget de rutina

*Idea del autor, 19 de septiembre de 2026. Es la función premium más fuerte que
tiene el producto.*

**Cómo funciona:** la app nota que esta persona toma la micro casi todos los
días alrededor de las 7:00 en el mismo paradero. Sin que tenga que configurar
nada, **quince minutos antes aparece en la pantalla de inicio del teléfono un
widget con las micros que vienen a ese paradero**. La persona mira el celular
mientras se toma el café y decide si sale ya o le quedan cinco minutos.

**Por qué es tan buena:**

1. **Invierte la relación con la app.** Todas las apps de transporte esperan a
   que las abras. Esta te busca a ti, justo cuando sirve. Es la diferencia entre
   una herramienta y un hábito.
2. **Se paga sola en el momento de mayor valor.** La gente paga por lo que le
   ahorra estrés a las 7 de la mañana, no por lo que le sirve una vez al mes.
3. **Es visible sin abrir nada.** Un widget en la pantalla de inicio es
   publicidad permanente y gratuita del producto, en el teléfono del usuario.
4. **Respeta la regla de §7.4:** no entrega información que la versión gratuita
   no tenga. Lo que se cobra es la **anticipación**: que aparezca sola, en el
   momento justo, sin pedirla.
5. **Sólo la puede hacer quien tenga el historial.** Aprender la rutina exige
   saber qué hace la persona todos los días, lo que a su vez exige el servidor.
   Es una ventaja que no se copia fácil.

**Lo que hay que resolver:**

- Los widgets **no se pueden escribir en React Native**. En iOS hay que hacerlos
  en SwiftUI con WidgetKit y en Android con Kotlin, igual que la app del reloj
  (`02` §2.2b). Son módulos nativos chicos, alimentados por la misma API.
- **Detectar la rutina** requiere guardar patrones de uso. Eso es dato personal,
  así que va con consentimiento explícito y bajo las reglas de `03` §3.7.
- La rutina se puede **inferir** (sin que el usuario configure nada) o
  **declarar** (el usuario elige paradero y hora). Conviene empezar por la
  declarada, que es mucho más simple y ya vale, y agregar la inferencia después.

**Encaja naturalmente con el reloj:** la misma información, en la muñeca, quince
minutos antes. El mismo módulo nativo sirve para los dos.

**Precio sugerido:** CLP 990–1.490 mensuales, o CLP 8.900 al año. Y considerar
seriamente un **pago único** (CLP 4.900–6.900): en Chile la resistencia a las
suscripciones es alta, y un pago único convierte notablemente mejor. La
infraestructura la va a pagar la capa 3, no ésta.

**Expectativa realista:** conversión de 1 a 3% de usuarios activos. Con 50.000
usuarios, del orden de 1.000 a 2.000 USD mensuales. **Cubre los costos y poco
más — y está bien: ése es todo su trabajo.**

---

## 7.5 Capa 3 — El negocio de verdad: datos agregados de movilidad

Aquí está el ingreso serio, y —esto es lo importante— **es la capa menos invasiva
de las tres, porque el usuario ni siquiera se entera de que existe.**

### Qué tienes que nadie más tiene

Al fusionar red.cl con la telemetría de tus usuarios, terminas midiendo algo que
hoy **nadie mide de forma independiente**:

- **Tiempos de llegada reales**, no programados, paradero por paradero.
- **Tiempos de viaje reales** entre pares de paraderos, por hora y día.
- **Regularidad efectiva**: si la frecuencia prometida se cumple o los buses
  viajan apareados.
- **Desvíos e interrupciones**, detectados automáticamente y con hora exacta.
- **Brecha entre lo prometido y lo ocurrido**, que es justamente el indicador que
  la autoridad usa para fiscalizar y pagar a los operadores.

El propio sistema oficial mide su desempeño con sus propios instrumentos. Tú
tendrías una **medición externa e independiente**. Eso vale dinero y no lo tiene
nadie más.

### Quién paga por eso

| Cliente | Para qué lo quiere | Dificultad |
|---|---|---|
| **DTPM / MTT** | Fiscalización independiente del cumplimiento de los operadores | Alta (compra pública, lenta) pero es el cliente natural |
| **Operadores de buses** (Metbus, Vule, STP, etc.) | Saber dónde pierden tiempo antes de que se lo descuenten | Media — tienen incentivo económico directo |
| **Municipios** | Planificación de vías, priorización de corredores, semáforos | Media |
| **Consultoras e inmobiliarias** | Estudios de accesibilidad y conectividad de un terreno | Baja — venta directa |
| **Academia** (universidades, centros de estudios urbanos) | Investigación en movilidad | Baja, pero paga poco |

Un solo contrato anual con un municipio o un operador puede superar todo el
ingreso premium del año. **Y el usuario no ve ni un cambio en su app.**

### Las reglas que lo hacen no invasivo

Esto sólo funciona si se hace de forma irreprochable. No son buenas intenciones,
son requisitos técnicos:

1. **Sólo agregados. Jamás trazas individuales.** Se vende "la 506 demora 22 min
   entre Plaza Italia y Los Leones a las 18:00", nunca "este teléfono se movió
   así". No es una promesa: la base de datos ni siquiera guarda lo segundo
   (ver `03` §3.7).
2. **k-anonimato**: ningún agregado que provenga de menos de *k* usuarios
   distintos se publica ni se vende (sugerido: k ≥ 5). Bajo ese umbral, un
   agregado puede identificar a una persona.
3. **Consentimiento separado y explícito**, distinto del permiso de ubicación,
   redactado en castellano claro y revocable con un toque.
4. **Página pública de transparencia** que muestre exactamente qué se comparte y
   con quién. Si no te atreves a publicarla, no lo hagas.
5. **Nunca vender a corredores de datos, aseguradoras ni publicidad.** Sólo
   entidades cuyo uso sea planificación o fiscalización del transporte. Esta
   restricción es la que hace defendible todo lo anterior.

### La jugada estratégica: publicar parte abierta

Recomendación fuerte: **publicar gratis y abiertamente un subconjunto de los
datos agregados** — por ejemplo, un ranking mensual de puntualidad por línea.

No es altruismo. Hace cuatro cosas a la vez:

- **Prensa gratis.** "App ciudadana mide el cumplimiento real del transporte de
  Santiago" es una nota que los medios publican solos. Adquisición de usuarios a
  costo cero.
- **Construye la relación con el DTPM**, que es además tu proveedor de datos
  (`01` §1.2). Llegar con un aporte en la mano cambia por completo la
  conversación sobre el acceso al GPS oficial.
- **Blinda la reputación.** Un producto que publica sus datos abiertamente no
  parece estar explotando a sus usuarios, porque no lo está.
- **Es la mejor demostración comercial posible** de lo que vendes en privado.

---

## 7.6 Oportunidad adicional: recarga de tarjeta Bip!

Permitir consultar saldo y **recargar desde la app**, cobrando una comisión
pequeña por transacción.

- **A favor:** es un servicio que el usuario *quiere*, no algo que se le impone.
  Recurrente, y encaja perfecto con el momento de uso.
- **En contra:** requiere convenio con el operador del sistema Bip! y
  cumplimiento de normativa de medios de pago. **Factibilidad por verificar.**

Es un complemento, no un pilar. Vale la pena explorarlo cuando la app ya tenga
usuarios que le den poder de negociación.

---

## 7.7 Lo que queda explícitamente descartado

| Descartado | Motivo |
|---|---|
| Publicidad en cualquier formato | §7.1 — destruye el permiso de ubicación |
| Vender datos individuales o trazas | Destruye la confianza y probablemente la empresa |
| Paywall sobre funciones esenciales | Reduce la base de sensores, que es la materia prima |
| Cuenta obligatoria para usar la app | Fricción de entrada en un producto que necesita escala |
| Datos a aseguradoras, bancos o corredores de datos | Riesgo reputacional desproporcionado al ingreso |

---

## 7.7b Los números reales, revisados en 2026

Datos de mercado al 19 de septiembre de 2026. Conviene rehacer este cálculo
antes de tomar cualquier decisión de inversión: cambia rápido.

### Lo que se gasta

| Etapa | Mensual |
|---|---|
| **Hoy (desarrollo)** | **USD 0** — Supabase, Stadia, GitHub y OpenStreetMap tienen plan gratuito suficiente |
| Al publicar | ~USD 55: Apple USD 99/año, Supabase ~25, Stadia ~20, dominio ~1 |
| Con tracción | Crece con la telemetría, que es lo que más escribe en la base |

### Lo que entra, y la mala noticia

**El ingreso por usuario en Latinoamérica ronda los USD 0,10**, frente a
mercados como Estados Unidos que están en otro orden de magnitud. Es la
restricción que manda sobre todo lo demás, y no se arregla con mejor producto.

La compensación: Latinoamérica tiene **la mayor tasa de crecimiento de ingresos
recurrentes de cualquier región** (~17% mensual mediano). Es un mercado chico
por usuario, pero que crece rápido.

Para apps de utilidad, la publicidad rinde del orden de USD 0,01 a 0,05 por
usuario activo, y la suscripción supera a la publicidad en cuanto el producto
resuelve un problema real: mil suscriptores rinden más que cien mil usuarios con
avisos.

### Comisión de las tiendas

- **Programa de Pequeñas Empresas de Apple:** 15% mientras se facture menos de
  USD 1 millón al año. Hay que inscribirse; no es automático.
- **Pagos fuera de la app:** tras los fallos de Epic contra Apple, en Estados
  Unidos hoy se puede enlazar a un pago externo **sin comisión**, y Apple
  propuso cobrar 5% a pequeñas empresas. En Chile la situación no es la misma:
  hay que verificarla antes de contar con ello.

### La cuenta para este producto

Suscripción de CLP 1.490 (~USD 1,50) con 2% de conversión, menos 15% de
comisión:

| Usuarios activos | Suscriptores | Ingreso neto mensual | ¿Cubre los ~USD 55? |
|---|---|---|---|
| 5.000 | ~100 | ~USD 127 | Sí, con holgura |
| 20.000 | ~400 | ~USD 510 | Sí |
| 50.000 | ~1.000 | ~USD 1.275 | Sí, pero no es un sueldo |

**Conclusión incómoda y central:** con los ingresos de consumidores en Chile,
este producto **cubre sus costos, no se convierte en negocio**. Llegar a 50.000
usuarios activos —que sería un éxito rotundo para una app nueva— rinde menos que
un sueldo.

Eso no invalida el plan: **lo confirma**. Por eso el negocio está en la capa 3
(§7.5), donde un solo contrato anual con un municipio o un operador puede
superar todo el ingreso de consumidores del año. La app no es el producto que se
vende; es el instrumento que produce el dato que sí se vende.

### Qué hacer con esto

1. **No apurarse a monetizar.** Cobrar antes de tener el diferenciador
   funcionando sólo frena el crecimiento, que es lo único que importa ahora.
2. **Inscribirse en el Programa de Pequeñas Empresas de Apple** apenas se tenga
   la cuenta: es la diferencia entre 15% y 30%.
3. **Tratar la suscripción como cobertura de costos**, no como el negocio.
4. **Empezar a hablar con posibles compradores del dato mucho antes de tener el
   dato.** Un municipio tarda meses en comprar; conviene que el proceso corra en
   paralelo al desarrollo, no después.

### Fuentes

- [RevenueCat — State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps)
- [AppsFlyer — The State of App Monetization 2026](https://www.appsflyer.com/resources/reports/app-marketing-monetization-report/)
- [Apple App Store Small Business Program 2026](https://appbuilder24.com/blog/apple-small-business-program)
- [TechCrunch — Apple proposes 15% cut on external purchases](https://techcrunch.com/2026/08/14/apple-proposes-to-take-a-15-cut-of-purchases-made-outside-the-app-store/)
- [MonetizeMore — Ad revenue benchmarks 2026](https://www.monetizemore.com/blog/how-much-ad-revenue-can-apps-generate/)

## 7.7c Plan concreto para llegar a un sueldo extra

*Objetivo declarado por el autor: un ingreso complementario. Se toma como meta
**CLP 400.000 mensuales netos (~USD 430)**. Si la meta real es otra, los números
de abajo escalan proporcionalmente.*

### Aclaración previa: las tiendas no pagan por descargas

Conviene dejarlo escrito porque es un malentendido frecuente y caro.

**Apple y Google no pagan nada por descargas.** Son intermediarios de cobro: se
quedan con un porcentaje de lo que tú vendes. El Programa de Pequeñas Empresas
no es un ingreso, es un **descuento en la comisión** —de 30% a 15%— sobre
ventas que tú tienes que generar. Una app gratis descargada un millón de veces
genera exactamente cero pesos.

Todo ingreso sale de una de tres fuentes: **alguien paga dentro de la app,
alguien paga por publicidad, o alguien paga por el dato.**

### Las tres vías, ordenadas por cuándo pueden rendir

#### Vía rápida — Estudios de accesibilidad *(desde ya, sin un solo usuario)*

La menos obvia y la única que puede rendir en los próximos meses.

Con el feed del DTPM ya cargado se puede responder, para cualquier dirección de
Santiago: cuántas líneas la sirven, a qué distancia está el paradero más
cercano, cuánto se demora hasta el centro, qué comunas quedan a menos de 45
minutos. Eso es un **estudio de accesibilidad**, y lo compran inmobiliarias,
corredoras y consultoras urbanas para sus proyectos.

- **Ingreso estimado:** del orden de CLP 250.000 a 600.000 por estudio.
  *(Rango a validar con clientes reales; no hay precio de lista.)*
- **Requiere:** cero usuarios. El dato ya está.
- **Contra:** es consultoría, no ingreso pasivo. Cada peso cuesta horas.
- **A favor:** financia el proyecto mientras crece, y obliga a hablar con los
  mismos compradores que después comprarán el dato de movilidad.

#### Vía media — Suscripción *(mes 12 en adelante)*

Cubre los costos de operación, y poco más (§7.7b).

Para que aporte CLP 400.000 netos harían falta del orden de **15.000
suscriptores**, o sea cientos de miles de usuarios activos. No es el camino.

#### Vía principal — Datos agregados de movilidad *(mes 12 a 24)*

**Un solo contrato anual del orden de CLP 5 millones equivale a CLP 416.000
mensuales.** Es decir: *un* cliente alcanza la meta.

Compradores por orden de facilidad:

| Comprador | Por qué compra | Dificultad |
|---|---|---|
| Consultoras e inmobiliarias | Estudios de accesibilidad para proyectos | Baja: venta directa, sin licitación |
| Operadores de buses | Saber dónde pierden tiempo antes de que se lo descuenten | Media: tienen incentivo económico directo |
| Municipios | Planificación de vías y corredores | Media-alta: compra pública, lenta |
| DTPM / MTT | Fiscalización independiente de los operadores | Alta, pero es el cliente natural |

### Cronograma con cifras

| Meses | Qué se hace | Ingreso mensual esperado |
|---|---|---|
| 0–6 | Construir. **No monetizar.** | CLP 0 |
| 3–9 | Primeros estudios de accesibilidad | CLP 0–500.000, irregular |
| 9–15 | Lanzar, crecer, activar suscripción | Cubre costos |
| 12–24 | Primer contrato de datos | **CLP 400.000+, estable** |

### Las tres cosas que hay que hacer ahora para que esto ocurra

1. **Hablar con posibles compradores antes de tener el producto.** Un municipio
   tarda meses en comprar. Si la conversación parte cuando el dato ya existe, se
   suma medio año al calendario. Si parte ahora, el producto llega con clientes
   esperando.
2. **Probar la vía rápida con un caso real.** Un solo estudio de accesibilidad
   vendido valida que alguien paga por esto, y eso vale más que cualquier
   proyección de esta tabla.
3. **Guardar el histórico desde el primer día.** El valor del dato agregado es
   proporcional a cuántos meses se lleven acumulados. Los datos que no se
   capturan hoy no se recuperan (`04` §4.6).

### La advertencia honesta

Nada de esto es ingreso pasivo en el corto plazo. Una app que rinde un sueldo
extra con usuarios chilenos es rara, y las que lo logran tardan años. **Lo que
puede rendir antes es vender el análisis, no la app.**

Quien quiera un ingreso complementario pronto debería tratar los estudios de
accesibilidad como el producto inmediato, y la app como la inversión que
después convierte ese trabajo por hora en algo que escala.

## 7.8 Cronología

| Momento | Ingreso | Meta |
|---|---|---|
| Fases 0–3 | Ninguno | Crecer. Costo asumido como inversión |
| Fase 4 | Premium | Cubrir infraestructura |
| Fase 4–5 | Publicación abierta de agregados | Prensa, usuarios, relación con DTPM |
| Fase 5+ | Primeros contratos B2B | Convertirlo en negocio |
| Después | Bip!, licenciamiento a otras ciudades | Escalar |

**La idea en una frase:** el usuario nunca paga con atención ni con privacidad.
Paga —si quiere— con dinero por comodidad; y sin saberlo, aporta un dato anónimo
que hace mejor el transporte público de toda la ciudad, y que es lo que
efectivamente sostiene el negocio.
