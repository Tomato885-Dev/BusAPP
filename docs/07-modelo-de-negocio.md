# 07 — Modelo de negocio

> Premisa de diseño: **cero invasión al usuario.** Ninguna fuente de ingreso
> puede interrumpir, degradar la experiencia gratuita, ni traicionar la
> confianza sobre la que se sostiene la recolección de ubicación.

## 7.1 Por qué la publicidad está descartada (y no por gusto)

El brief ya planteaba "poca publicidad". El análisis técnico lleva a una
conclusión más fuerte: **la publicidad es directamente incompatible con este
producto.** Tres razones independientes.

### Razón 1 — Destruye el permiso que el producto necesita

El motor de Bus Checker depende de que el usuario comparta su ubicación de forma
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
| **Notificaciones inteligentes** — "sal ahora", "tu micro se desvió, anda al otro paradero" | La información está gratis; lo que se cobra es que te busque a ti en vez de que tú la busques |
| **Live Activity / Dynamic Island / widget** — el ETA en la pantalla bloqueada | Comodidad pura. Es además la función más vistosa y la que más convierte |
| **Alertas de viaje recurrente** — "avísame todos los días a las 7:40 cómo está la 506" | Automatización, no información |
| **Historial personal** — cuánto esperas realmente al mes, qué línea te falla más | Dato propio, entretenido, cero impacto en quien no paga |
| **Apple Watch / Wear OS** | Comodidad de plataforma |

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
