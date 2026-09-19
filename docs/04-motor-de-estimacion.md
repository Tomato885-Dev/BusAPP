# 04 — Motor de estimación

Aquí vive la diferencia entre Bus Checker y las apps que ya existen. Todo lo
demás del proyecto (mapas, favoritos, planificador) es replicable; esto no.

## 4.1 El cambio conceptual

Las apps actuales responden **"¿cuántos minutos faltan?"**. Bus Checker debe
responder **"¿qué está pasando con mi viaje?"**, y eso incluye tres respuestas
que las otras no dan:

- *"Viene en 4 minutos, y estamos seguros."*
- *"Deberían ser 7 minutos, pero no tenemos datos en vivo. Tómalo con cuidado."*
- *"Esta micro no va a llegar. Anda al paradero de la esquina y toma la 210."*

La tercera es la que justifica el producto. Y la segunda es igual de importante:
**mostrar un número falso es peor que admitir que no se sabe**, porque hace que
la persona siga esperando.

> **Principio rector:** ante la duda, decir "no sé". Una app que a veces dice
> "no tengo datos" resulta más confiable que una que siempre da un número y a
> veces miente. La confianza del usuario es el activo, no la precisión aparente.

## 4.2 Estados posibles de una línea en un paradero

El motor no produce un número: produce un **estado** más, cuando corresponde, un
número.

| Estado | Significado | Qué ve el usuario |
|---|---|---|
| `EN_RUTA` | Hay evidencia de que el bus avanza hacia el paradero | ETA con rango y nivel de confianza |
| `SIN_INFO` | Sólo hay horario programado | ETA programado, marcado explícitamente como estimación |
| `SOSPECHA_DESVIO` | Señales contradictorias o reportes aislados | ETA + advertencia visible |
| `DESVIADO` | Evidencia consistente de que el recorrido cambió | Advertencia, sin ETA |
| `NO_LLEGARA` | Alta confianza de que no pasará por este paradero | Aviso claro + alternativas sugeridas |

Pasar de `SOSPECHA_DESVIO` a `DESVIADO` y de ahí a `NO_LLEGARA` debe exigir
evidencia creciente. **El costo de los errores es asimétrico:** decir "no llega"
cuando sí llegaba hace que el usuario pierda su micro y desinstale la app. Decir
"viene" cuando no venía es el fallo que ya cometen todas las apps y que el
usuario perdona. Por eso `NO_LLEGARA` debe ser conservador.

## 4.3 Señales de entrada

### S1 — Desviación geométrica *(requiere posiciones GPS)*

El GTFS trae el trazado (`shape`) de cada recorrido. Si un bus se aleja de su
trazado más de un umbral durante varias muestras consecutivas, está desviado.

```
distancia_al_shape = distancia(posicion_bus, linea_del_recorrido)
si distancia_al_shape > UMBRAL_M durante N muestras consecutivas:
    → señal de desvío
```

Valores iniciales sugeridos: `UMBRAL_M = 150`, `N = 3` muestras (~90 s). Deben
calibrarse con datos reales: en calles paralelas y estrechas 150 m puede generar
falsos positivos; con GPS impreciso en zonas de edificios altos, también.

**Señal fuerte.** Es la única totalmente objetiva, y es la que hace valioso
conseguir el acceso oficial a datos de posición.

### S2 — Ausencia anómala

Si por una línea con frecuencia de 8 minutos no se observa ningún bus en el
tramo anterior al paradero durante 25 minutos, algo pasa. No dice *qué*, pero
basta para degradar la confianza.

```
si tiempo_desde_ultimo_bus_observado > FACTOR × headway_programado:
    → degradar confianza; si el factor crece, elevar a SOSPECHA_DESVIO
```

**Señal débil pero gratuita:** funciona con cualquier fuente de datos, incluso
sólo con llegadas históricas.

### S3 — Reportes de usuarios

Un reporte no vale por sí solo. Su peso se calcula:

```
peso = reputacion_usuario
     × decaimiento_temporal(antiguedad)      // exp(-t/20min)
     × proximidad_geografica(distancia_al_paradero)
     × factor_independencia
```

- **Proximidad:** sólo se aceptan reportes emitidos cerca del paradero o del
  recorrido afectado. Alguien en otra comuna no puede reportar un desvío.
- **Independencia:** cinco reportes de personas que estaban juntas en el mismo
  paradero valen menos que cinco de puntos distintos del recorrido. Sin esto, un
  grupo pequeño coordinado puede inyectar información falsa.
- **Decaimiento:** un desvío de hace dos horas probablemente ya terminó.

### S4 — Histórico

La tabla `arrival_history` permite responder "¿cuánto tarda realmente la 506
entre estos dos paraderos, un martes a las 18:00?". El horario programado es
una ficción optimista en hora punta; el histórico la corrige.

No requiere nada más que registrar llegadas desde el día uno. **Es la señal más
barata de acumular y la más fácil de olvidar.**

### S5 — Telemetría de usuarios a bordo

Si alguien viaja en la línea con la app activa, su GPS aproxima el del bus.
Requiere inferir que va a bordo: velocidad compatible, trayectoria que sigue el
`shape`, paradas que coinciden con paraderos de la línea.

**Señal potencialmente muy fuerte**, y la única vía hacia datos de posición que
no depende de un permiso externo. También la más costosa en privacidad y batería
(ver `03`, §3.7 y §3.8).

## 4.4 Cómo se combinan

```
                                 ┌─────────────────┐
   S1 desviación geométrica ───► │                 │
   S2 ausencia anómala ────────► │   Agregador     │ ──► estado + ETA
   S3 reportes ponderados ─────► │   de evidencia  │     + confianza
   S4 histórico ──────────────►  │                 │     + explicación
   S5 telemetría ─────────────►  └─────────────────┘
```

**Empezar con reglas, no con machine learning.** Un sistema de puntajes con
umbrales explícitos es depurable, explicable al usuario y no necesita datos de
entrenamiento —que al inicio no existen. Sólo cuando haya meses de
`arrival_history` tiene sentido evaluar un modelo, y aun así probablemente sólo
para el ETA, no para la decisión de `NO_LLEGARA`, donde la explicabilidad importa
más que la precisión.

Esbozo del agregador:

```python
def evaluar(linea, paradero):
    ev = 0.0
    ev += 0.50 if S1.desviado(linea)            else 0.0
    ev += 0.15 if S2.ausencia_anomala(linea)    else 0.0
    ev += min(0.40, S3.peso_reportes(linea, paradero))
    ev += 0.20 if S5.contradice_recorrido(linea) else 0.0

    if ev >= 0.75:  return NO_LLEGARA
    if ev >= 0.45:  return DESVIADO
    if ev >= 0.20:  return SOSPECHA_DESVIO
    return EN_RUTA if hay_datos_en_vivo(linea) else SIN_INFO
```

Los pesos y umbrales son un **punto de partida para calibrar**, no valores
correctos. Deben vivir en configuración, no incrustados en el código, para
poder ajustarlos sin desplegar.

## 4.5 Cálculo del ETA

```
ETA = tiempo_base + ajuste_historico + ajuste_en_vivo
```

1. **Base:** distancia al paradero siguiendo el recorrido ÷ velocidad esperada.
2. **Ajuste histórico:** factor por día de la semana y franja horaria, desde `arrival_history`.
3. **Ajuste en vivo:** velocidad observada del bus en el tramo actual, si existe.

Y siempre acompañado de un **rango**, no de un número exacto. `[3, 6] min`
comunica la incertidumbre real; `4 min` promete una precisión que el sistema no
tiene. El rango se ensancha a medida que baja la confianza.

Niveles de confianza:

| Nivel | Condición |
|---|---|
| **Alta** | Posición en vivo de menos de 60 s, bus sobre el recorrido |
| **Media** | Posición en vivo antigua, o telemetría de un solo usuario |
| **Baja** | Sólo horario + histórico |
| **Sin datos** | Ni horario confiable ni observaciones |

## 4.6 Resistencia al abuso

Un sistema que deja a los usuarios afirmar "esta micro no viene" **será
manipulado**: por competencia, por bromas o por error. Mínimos necesarios:

- Reputación por usuario, que sube con reportes confirmados y baja con los
  desmentidos.
- Límite de frecuencia de reportes por usuario y por dispositivo.
- Validación geográfica obligatoria (S3).
- Requerir varios reportes independientes antes de mostrar nada.
- Nunca dejar que un reporte por sí solo produzca `NO_LLEGARA`; ese estado
  siempre exige corroboración de una señal objetiva o de un volumen
  significativo de reportes independientes.
- Expiración automática: todo reporte caduca (30–60 min según tipo).

## 4.7 Cómo saber si el motor funciona

Sin esto, el motor es una opinión con formato de dato.

**Registrar cada predicción y compararla con lo que pasó.** Cada vez que se
entrega un ETA, se guarda; cuando el bus efectivamente llega, se calcula el
error. Métricas a seguir desde el primer día:

| Métrica | Qué mide | Meta inicial |
|---|---|---|
| Error absoluto medio del ETA | Precisión general | Mejor que el horario programado |
| % de ETA dentro del rango anunciado | Honestidad de la incertidumbre | > 80% |
| Falsos `NO_LLEGARA` | Veces que dijimos "no viene" y vino | **< 2%** |
| Falsos `EN_RUTA` | Veces que dijimos "viene" y no vino | < 15% |
| Cobertura de confianza alta | % de consultas con datos en vivo | Depende de la fuente |

La métrica crítica es **falsos `NO_LLEGARA`**. Es el error que destruye la
confianza del usuario de forma irreversible, y por eso su umbral es el más
estricto de todos.

**El benchmark correcto no es la perfección, es el horario programado.** Si el
motor no le gana al GTFS estático, no está aportando nada y hay que revisar las
señales antes de seguir construyendo sobre él.
