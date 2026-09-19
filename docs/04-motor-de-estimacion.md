# 04 — Motor de estimación

Aquí vive la diferencia entre Kupay y las apps que ya existen. Todo lo
demás del proyecto —mapas, favoritos, planificador— es replicable; esto no.

## 4.1 La idea central

El sistema mantiene **dos estimadores independientes** del mismo número
—"cuántos segundos faltan para que la línea 506 llegue al paradero PA420"— y los
combina estadísticamente:

| | Origen | Qué mide |
|---|---|---|
| **E₁** | Predictor de red.cl | Lo que el sistema oficial cree que va a pasar |
| **E₂** | Telemetría de usuarios a bordo | Dónde está efectivamente el bus, ahora |

E₂ no proviene de que nadie reporte nada. **Cada usuario con la app y el permiso
de ubicación activo es un sensor pasivo**, sin realizar ninguna acción. Si tres
personas avanzan por el trazado de la 506 y están a 1,8 km del paradero, el
sistema sabe cuándo llega esa micro, diga lo que diga la fuente oficial.

> **La diferencia con un sistema tipo Waze es esencial, no de grado.** Ahí el
> usuario decide reportar; aquí no hay nada que decidir. En apps comunitarias
> sólo un pequeño porcentaje de usuarios reporta algo alguna vez, y justo cuando
> más se necesitaría el reporte —vas apurado, llueve, vas apretado— es cuando
> menos ganas hay de sacar el teléfono. El sensor pasivo no tiene ese problema:
> **aportan todos los que dieron el permiso, sin hacer nada.**

## 4.2 Cálculo de cada estimador

### E₁ — fuente oficial

Se consulta directamente y se guarda. Su incertidumbre **no se supone: se mide**
(ver §4.6), contrastando cada predicción con la llegada que efectivamente
ocurrió.

```
E₁ = eta_reportado_por_la_fuente
σ₁ = error histórico de esa fuente, para esa línea, franja horaria y
     distancia al paradero
```

El desglose importa: la fuente oficial suele ser razonable a 2 minutos y mala a
15, y peor en hora punta. Un único σ₁ global desperdicia esa información.

### E₂ — telemetría

Dado un usuario asignado a la línea R, en la posición `s` medida **a lo largo del
trazado** (no en línea recta), con el paradero en `s_paradero`:

```
distancia_restante = s_paradero − s
E₂ = distancia_restante / velocidad_esperada(tramo, día, hora)
```

La `velocidad_esperada` sale del histórico de ese tramo en esa franja horaria,
corregida por la velocidad que ese mismo usuario trae en los últimos minutos.

σ₂ crece con:
- la **distancia restante** (a más lejos, más incierto);
- la **ambigüedad del emparejamiento** — qué tan seguro está el sistema de que
  ese usuario va efectivamente en la 506 (§4.4);
- la **precisión del GPS** reportada por el dispositivo;

y decrece con el **número de usuarios independientes** a bordo del mismo bus.

### Paso previo: agrupar usuarios en vehículos

No sirve saber que "hay tres usuarios en la 506": hay que saber si van en el
**mismo bus** o en tres buses distintos, porque al usuario del paradero le
importa **el próximo**, no cualquiera.

Dos usuarios que se mantienen a menos de ~40 m con velocidades casi idénticas
durante varios minutos van en el mismo vehículo. Es un agrupamiento sencillo
sobre (posición, velocidad, tiempo), y hay que hacerlo **antes** de calcular E₂.

## 4.3 La fusión

Lo estadísticamente correcto para combinar dos estimaciones independientes es la
**ponderación por el inverso de la varianza**, que es la combinación lineal de
mínima varianza:

```
                E₁/σ₁²  +  E₂/σ₂²                          1
   ETA_fusión = ──────────────────        σ²_fusión = ──────────────
                 1/σ₁²  +  1/σ₂²                       1/σ₁² + 1/σ₂²
```

La fuente más confiable pesa más, automáticamente. Si una falta, su peso se va a
cero solo y la fórmula sigue siendo válida — **no hay que escribir casos
especiales**, que es donde suelen aparecer los errores.

Esto entrega tres cosas de una sola vez:

1. **Un ETA mejor** que el de cualquiera de las dos fuentes por separado.
2. **El intervalo de confianza, gratis.** `σ_fusión` *es* el rango. Ya no hay que
   inventarlo: `ETA ± 2σ` es el intervalo que se le muestra al usuario.
3. **El detector de anomalías** (§4.4).

### Refinamiento posterior: filtro de Kalman

La versión madura modela el estado como la **posición del bus a lo largo del
recorrido** (una sola dimensión: distancia recorrida), con las dos fuentes como
mediciones de distinta precisión que llegan en momentos distintos.

Ventajas: suaviza el ruido del GPS, extrapola entre mediciones y maneja bien que
las fuentes no lleguen sincronizadas. **No empezar por aquí.** La ponderación por
varianza es suficiente para lanzar y mucho más fácil de depurar.

## 4.4 El desacuerdo es la señal

Esto es lo que ninguna app de la competencia puede hacer.

Si ambos estimadores miden lo mismo, su diferencia debería ser pequeña respecto
de la incertidumbre combinada. Cuando no lo es, no es ruido: **es la firma
estadística de que algo pasó.**

```
              |E₁ − E₂|
      z  =  ───────────────          z > 3  →  las fuentes se contradicen
             √(σ₁² + σ₂²)
```

El caso más importante es asimétrico: **la fuente oficial anuncia una micro que
viene, pero nadie que vaya en ella se está acercando al paradero.** Se desvió, se
detuvo, o el dato oficial quedó obsoleto. Da igual cuál de las tres: al usuario
hay que decírselo.

### Estados que se derivan

| Estado | Condición | Qué ve el usuario |
|---|---|---|
| `EN_RUTA` | Fuentes concuerdan (z < 2) | ETA con rango estrecho |
| `SIN_TELEMETRIA` | Sólo E₁ disponible | ETA oficial, rango ancho, marcado como estimación |
| `DISCREPANCIA` | 2 ≤ z < 3 | ETA + advertencia visible |
| `PROBABLE_DESVIO` | z ≥ 3, o usuarios a bordo fuera del trazado | Advertencia, sin ETA |
| `NO_LLEGARA` | z ≥ 3 sostenido + confirmación geométrica | Aviso claro + alternativas |

**Los umbrales de `NO_LLEGARA` deben ser conservadores**, porque el costo de los
errores es asimétrico: decir "no llega" cuando sí llegaba hace que la persona
pierda su micro y desinstale la app. Decir "viene" cuando no venía es el error
que ya cometen todas las apps y que el usuario perdona.

### Confirmación geométrica

El GTFS trae el trazado de cada recorrido. Si los usuarios asignados a la 506 se
alejan del trazado más de ~150 m durante varias muestras seguidas, eso es
evidencia **directa** de desvío, independiente de cualquier cálculo de tiempo.
Es la única señal totalmente objetiva del sistema, y por eso es la que debe
exigirse para llegar a `NO_LLEGARA`.

## 4.5 El problema difícil: ¿en qué micro va el usuario?

Conviene decirlo sin rodeos: **la fusión estadística es la parte fácil.** Son
unas treinta líneas de código. El 80% del trabajo de ingeniería está aquí, y es
donde el proyecto se gana o se pierde.

El sistema recibe una traza GPS y debe decidir: ¿va en la 506, en la 210 que
comparte el mismo corredor, en auto por la misma calle, en bicicleta, o en el
Metro que corre por debajo?

En ejes como la Alameda o Providencia hay decenas de líneas compartiendo
trazado. **Una traza ahí es genuinamente ambigua**, y ninguna cantidad de
ingenio la desambigua mientras las líneas no se separen.

### Señales que lo resuelven

| Señal | Por qué discrimina |
|---|---|
| **Patrón de detenciones** ⭐ | La más fuerte. Un bus se detiene *en los paraderos*; un auto se detiene *en los semáforos*, que están en otras coordenadas. Comparar dónde se detuvo la traza contra las coordenadas de los paraderos de cada línea candidata separa bus de auto con mucha claridad |
| **Puntos de divergencia** | Mientras dos líneas van juntas no hay que decidir. En cuanto una dobla, la traza resuelve la ambigüedad sola. Conviene **mantener varias hipótesis abiertas** y dejar que la geometría las descarte |
| **Perfil de velocidad** | Un bus tiene una firma característica: acelera, avanza, se detiene 20–40 s, repite. Un auto es más continuo; una bicicleta es más lenta y constante |
| **Pérdida de señal GPS** | El Metro se delata solo: la señal desaparece en una estación y reaparece en otra |
| **Continuidad con el paradero de origen** | Si el usuario estuvo quieto en un paradero servido sólo por tres líneas, el espacio de hipótesis se reduce a tres antes de empezar |

### Cómo abordarlo

Mantener una **distribución de probabilidad sobre las líneas candidatas**, no una
única asignación. Se parte con el conjunto de líneas compatibles con el punto de
partida y se actualiza con cada nueva muestra. La telemetría sólo alimenta E₂
cuando alguna hipótesis supera un umbral de confianza (sugerido: 0,85); por
debajo de eso, se descarta el dato en vez de contaminar la estimación.

**Regla general del motor:** ante la duda, no aportar. Un dato malo es peor que
ningún dato, porque además arrastra el σ₂ hacia un valor falsamente optimista.

## 4.6 Verdad de terreno gratis

Una consecuencia elegante del diseño pasivo, y probablemente el detalle más
valioso de todo el documento:

> Si un usuario está **quieto en un paradero** y de pronto empieza a moverse a
> 25 km/h **siguiendo el trazado de la 506**, entonces esa micro acaba de llegar
> a ese paradero, a esa hora exacta.

Eso entrega el **tiempo de llegada real medido**, sin necesitar el GPS oficial de
nadie. Y habilita tres cosas:

1. **Medir σ₁.** Se puede calcular empíricamente cuánto se equivoca la fuente
   oficial, en vez de estimarlo a ojo. Sin esto, la fusión pondera con números
   inventados.
2. **Llenar `arrival_history`**, que alimenta las velocidades esperadas de E₂ y
   hace que el sistema mejore solo con el tiempo.
3. **Evaluar el motor** contra la realidad (§4.8).

**Se obtiene de la misma telemetría, sin pedir nada extra al usuario.** Por eso
la captura debe empezar en la fase 1, aunque todavía no se use para estimar: los
datos que no se capturan hoy no se recuperan mañana.

## 4.7 Cuánta gente hace falta

La pregunta clave del diseño es: ¿cuántos usuarios se necesitan para que E₂
exista? Y la respuesta es más optimista de lo que parece, porque **basta una
sola persona a bordo** para saber dónde va ese bus.

Si `p` es la fracción de pasajeros de un recorrido que lleva la app con
telemetría activa, la probabilidad de cubrir un bus con `n` pasajeros es
`1 − (1−p)ⁿ`:

| `p` | Bus en punta (~50 pas.) | Bus fuera de punta (~15 pas.) |
|---|---|---|
| 1% | 39% | 14% |
| 2% | 64% | 26% |
| 5% | **92%** | 54% |
| 10% | 99% | 79% |

**Conclusión operativa: con ~5% de penetración entre los pasajeros de un
corredor, se cubre más del 90% de los buses en hora punta.** Eso es alcanzable
de forma local, y es el argumento decisivo para **lanzar concentrado en una zona
acotada** —una comuna, un corredor— antes que disperso en todo Santiago.

> Es preferible ser la app dominante en Ñuñoa que marginal en toda la Región
> Metropolitana. La densidad local es lo que hace funcionar el motor; la
> cobertura amplia no aporta nada mientras la densidad sea baja.

*Advertencia sobre el modelo:* supone que los usuarios de la app se distribuyen
al azar entre los pasajeros, y no es así —se concentran por zona y por perfil
demográfico. La tabla sirve para dimensionar el orden de magnitud, no para
prometer coberturas.

## 4.8 Arranque en frío

Mientras no haya telemetría suficiente, `σ₂ → ∞`, su peso tiende a cero y la
fusión **degrada sola** a la fuente oficial. No hay que programar nada especial:
es la misma fórmula.

Lo que sí hay que cuidar es lo que ve el usuario. La app debe distinguir
visiblemente entre *"sabemos"* y *"estimamos"*, y poder decir **"no sé"**.

> **Principio rector:** ante la duda, decir "no sé". Una app que a veces admite
> no tener datos resulta más confiable que una que siempre entrega un número y a
> veces miente. Mostrar un ETA falso es peor que no mostrar nada, porque hace que
> la persona siga esperando — que es exactamente el problema que el producto dice
> venir a resolver.

## 4.9 Batería y muestreo

Una app de transporte que consume batería se desinstala, y cada desinstalación
es un sensor menos. El muestreo tiene que ser **adaptativo**, no continuo:

| Situación | Frecuencia |
|---|---|
| Usuario quieto | Mínima — *significant location change* del sistema operativo |
| Caminando | Baja (cada 60 s) |
| Moviéndose a velocidad compatible con bus, sobre un trazado | **Alta (cada 10–15 s)** |
| Hipótesis de línea ya descartada | Volver a mínima |

Es decir: **gastar batería sólo cuando el dato vale**, que es una fracción
pequeña del día. Medir el consumo real desde la fase 1 y tratarlo como métrica
de producto, no como detalle técnico.

## 4.10 Privacidad dentro del motor

Las reglas de `03` §3.7 se aplican dentro del pipeline, no sólo en la base de
datos:

1. Las trazas se procesan con un **identificador de sesión rotatorio**, nunca con
   el `user_id`.
2. Se **recortan los extremos** del trayecto: los primeros y últimos minutos son
   los que revelan domicilio y destino, y no aportan nada a la estimación.
3. Las posiciones crudas se **descartan tras procesarse**; sólo sobreviven los
   agregados por tramo.
4. La telemetría es **opt-in explícito** y revocable con un toque.
5. La app debe seguir siendo útil con la telemetría desactivada.

Esto no es sólo cumplimiento legal: es la condición que hace sostenible el
modelo de negocio (`07` §7.5).

## 4.11 Reportes manuales

Con el sensor pasivo como núcleo, los reportes manuales pasan a ser un
**complemento menor y opcional**, limitado a lo que el GPS no puede ver:

- "la micro pasó llena y no paró" — el bus sí llegó, pero el viaje no ocurrió;
- "hay corte de calle" — causa que el GPS observa como efecto, sin explicación.

Si se implementan, requieren validación geográfica, expiración automática y
límites de frecuencia. **Nunca deben poder producir `NO_LLEGARA` por sí solos**:
ese estado siempre exige confirmación geométrica.

> **Decisión pendiente:** si los reportes manuales entran o no en el producto.
> Descartarlos simplifica mucho —sin cuentas de usuario, sin reputación, sin
> moderación, sin abuso que combatir. Ver `06` §6.2.

## 4.12 Cómo saber si funciona

Sin esto, el motor es una opinión con formato de dato. Gracias a §4.6 se puede
medir de verdad: cada predicción se guarda y se contrasta con la llegada real.

| Métrica | Qué mide | Meta |
|---|---|---|
| Error absoluto medio del ETA fusionado | Precisión general | **Mejor que E₁ solo** |
| % de llegadas dentro del rango anunciado | Honestidad de la incertidumbre | > 80% |
| Falsos `NO_LLEGARA` | Dijimos "no viene" y vino | **< 2%** |
| Falsos `EN_RUTA` | Dijimos "viene" y no vino | < 15% |
| Precisión de la asignación de línea | Calidad del emparejamiento (§4.5) | > 90% |
| Cobertura de telemetría | % de consultas con E₂ disponible | Ver §4.7 |
| Consumo de batería | Retención de sensores | < 3%/día en uso típico |

Las dos críticas:

- **Falsos `NO_LLEGARA`** es el error que destruye la confianza de forma
  irreversible. Umbral estricto.
- **El benchmark correcto no es la perfección, es E₁.** Si el ETA fusionado no
  le gana de forma medible al predictor oficial por sí solo, la telemetría no
  está aportando y hay que arreglar el emparejamiento (§4.5) antes de seguir
  construyendo encima.
