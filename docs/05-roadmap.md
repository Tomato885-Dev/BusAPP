# 05 — Roadmap

## 5.1 La restricción que ordena todo el plan

El motor del producto (`04`) necesita usuarios a bordo de las micros. Pero para
tener usuarios hace falta una app que ya sea útil. Es el problema del huevo y la
gallina, y define la secuencia completa:

```
  App útil sin telemetría  →  usuarios  →  telemetría  →  motor de fusión
         (fase 1)                              (fase 2-3)      (fase 4)
                                                                  │
                            el diferenciador aparece aquí  ◄──────┘
```

Hay, sin embargo, una asimetría afortunada que conviene aprovechar:

> **El motor de inferencia se puede construir y validar con muy pocos usuarios.**
> Para desarrollar el emparejamiento de trazas (`04` §4.5) bastan unas decenas de
> viajes grabados por ti y tus conocidos. Para *operarlo* en producción se
> necesita densidad real; para *construirlo*, no.

Eso permite paralelizar: mientras la app crece, el motor se desarrolla contra
trazas ya capturadas. Es la diferencia con los reportes manuales, que no se
pueden ni construir ni probar sin escala.

Y de ahí sale la decisión más importante de todo el plan:

**Lanzar concentrado geográficamente.** Con ~5% de penetración entre los
pasajeros de un corredor se cubre más del 90% de los buses en punta (`04` §4.7).
Ese 5% es alcanzable en una comuna; es impensable en toda la Región
Metropolitana. La densidad local hace funcionar el motor; la cobertura amplia
no aporta nada mientras la densidad sea baja.

## 5.2 Fase 0 — Validación *(2 a 4 semanas, sin código de producto)*

Es la fase que se siente como pérdida de tiempo y es la que más tiempo ahorra.

| # | Tarea | Por qué importa |
|---|---|---|
| F0-1 | Descargar el GTFS vigente, validarlo, cargarlo en PostGIS | Confirma que el dato base existe y sirve |
| F0-2 | **Leer la licencia del GTFS para uso comercial** | Puede condicionar el modelo de negocio completo (`07`) |
| F0-3 | **Enviar la solicitud de acceso al DTPM** | Trámite lento; cada semana de demora en enviarlo retrasa todo el escenario A |
| F0-4 | Prototipo desechable: consultar llegadas de un paradero real | Verifica de punta a punta que E₁ se puede obtener |
| F0-5 | **Prueba de terreno: grabar 10–15 viajes reales en micro con una app de registro GPS** | ⭐ Verifica el supuesto central del producto |
| F0-6 | Decidir stack (`02` §2.5) | Cambiarlo después es carísimo |
| F0-7 | Definir nombre propio y verificar disponibilidad en ambas tiendas | "Bus Checker" colisiona con una app existente (`06` R6) |
| F0-8 | Elegir la zona de lanzamiento | Define todo el plan de crecimiento (§5.1) |

### Sobre F0-5, que es la tarea crítica

Antes de escribir una línea de la app, hay que responder empíricamente:

- ¿Se distingue una traza de bus de una de auto por el patrón de detenciones?
- ¿A cuántos metros del trazado cae el GPS en calles con edificios altos?
- ¿En cuántos minutos de viaje se resuelve la ambigüedad en un corredor
  compartido como la Alameda?
- ¿Cuánta batería consume un muestreo cada 10 segundos durante 40 minutos?

**No hace falta la app para responder esto:** basta cualquier registrador GPS y
analizar las trazas contra el GTFS. Es un fin de semana de trabajo que valida o
refuta el supuesto sobre el que descansa el proyecto entero.

**Criterio para avanzar:** confirmar que las trazas GPS permiten identificar el
recorrido con precisión aceptable. **Si esto falla, el producto necesita
rediseñarse**, y es infinitamente mejor descubrirlo ahora que en el mes seis.

## 5.3 Fase 1 — MVP: app útil + captura silenciosa *(8 a 12 semanas)*

Dos objetivos simultáneos. Sólo uno es visible.

### Objetivo visible: una pantalla, hecha muy bien

El usuario abre la app y en menos de tres segundos ve qué micros vienen a su
paradero. Sin telemetría todavía, sin fusión: sólo la fuente oficial, bien
presentada.

App:
- [ ] Permiso de ubicación en uso (**nada de background todavía**, ver `03` §3.8)
- [ ] Paraderos cercanos y pantalla de llegadas con autorefresco
- [ ] Búsqueda por código o nombre — funciona sin permiso de ubicación
- [ ] Mapa básico: paraderos, trazado del recorrido, ubicación del usuario
- [ ] Favoritos locales, sin cuentas de usuario
- [ ] Estados vacíos honestos: "sin datos en vivo" es una respuesta legítima

Backend:
- [ ] Ingesta del GTFS a PostGIS con actualización programada
- [ ] `/stops/nearby`, `/stops/{id}/arrivals`, `/routes/{id}/shape`
- [ ] Adaptador de fuente en vivo tras la abstracción de `01` §1.5
- [ ] **Contrato de API completo desde el inicio** (`03` §3.6), con `confidence`,
      `source` y `status`, aunque en esta fase devuelvan valores básicos. Cambiar
      el contrato después obliga a actualizar la app instalada

### Objetivo invisible: empezar a capturar

- [ ] Endpoint `/telemetry` y almacenamiento de trazas
- [ ] Consentimiento explícito y separado, honesto sobre su estado:
      *"estamos construyendo un sistema para saber si tu micro realmente viene.
      Tu ubicación anónima nos ayuda. Puedes desactivarlo cuando quieras."*
- [ ] Muestreo adaptativo (`04` §4.9) y medición del consumo de batería
- [ ] Anonimización y recorte de extremos desde el primer registro (`04` §4.10)
- [ ] **Detección de abordaje** → `arrival_history` (`04` §4.6)

Esto último es lo más importante de la fase y no se ve en la app: **empieza a
medir el error real de la fuente oficial (σ₁)**, que es lo que después hace
posible la fusión. Los datos que no se capturan hoy no se recuperan mañana.

Fuera de alcance: telemetría en background, fusión, planificador, premium.

**Criterio para avanzar:** una persona usa la app en su paradero habitual dos
semanas y la prefiere a la que usaba antes. Si no ocurre, el problema está en
esta pantalla y ninguna funcionalidad extra lo va a arreglar.

## 5.4 Fase 2 — Motor de inferencia de recorrido *(8 a 12 semanas)*

**La fase de investigación y desarrollo del proyecto.** Es la más incierta en
duración y la que decide si el producto existe.

Se trabaja mayormente **fuera de línea**, contra las trazas ya capturadas en la
fase 1, lo que permite iterar rápido sin desplegar nada.

- [ ] Emparejamiento de trazas contra los trazados del GTFS (*map matching*)
- [ ] Clasificación bus / auto / bicicleta / Metro por patrón de detenciones
- [ ] Hipótesis múltiples con probabilidad por línea candidata (`04` §4.5)
- [ ] Agrupamiento de usuarios en vehículos (`04` §4.2)
- [ ] Cálculo de E₂ y su σ₂
- [ ] Conjunto de validación etiquetado a mano (viajes reales con la línea
      anotada) para medir la precisión de la asignación

En paralelo, del lado del producto:
- [ ] **Ubicación en background**, con toda la justificación de `03` §3.8
- [ ] Crecimiento concentrado en la zona elegida en F0-8

**Criterio para avanzar: precisión de asignación de línea superior al 90%** en el
conjunto de validación. Por debajo de eso, la telemetría contamina la estimación
en vez de mejorarla, y encender la fusión empeoraría el producto.

## 5.5 Fase 3 — Fusión *(4 a 6 semanas)*

La primera vez que la telemetría se le nota al usuario.

- [ ] σ₁ calibrado empíricamente desde `arrival_history` (`04` §4.6)
- [ ] Ponderación por inverso de varianza en producción (`04` §4.3)
- [ ] Rango de confianza derivado de σ_fusión, visible en la UI
- [ ] Degradación automática a E₁ donde no hay telemetría (`04` §4.8)
- [ ] Panel interno de métricas (`04` §4.12)

**Criterio para avanzar:** el ETA fusionado le gana de forma medible al predictor
oficial por sí solo. Si no le gana, volver a la fase 2 — el problema está en el
emparejamiento, no en la fusión.

## 5.6 Fase 4 — Detección de desvíos: el diferenciador *(4 a 6 semanas)*

Aquí el producto hace lo que ninguna app de la competencia hace.

- [ ] Prueba de desacuerdo entre fuentes (`04` §4.4)
- [ ] Confirmación geométrica contra el trazado
- [ ] Estados `DISCREPANCIA`, `PROBABLE_DESVIO`, `NO_LLEGARA`
- [ ] UI para "esta micro no va a llegar" **con alternativas sugeridas** — avisar
      sin ofrecer salida sólo traslada el problema al usuario
- [ ] Notificaciones push de desvío en líneas favoritas
- [ ] Umbrales conservadores y monitoreo estricto de falsos positivos

**Criterio de éxito:** el sistema detecta un desvío real antes de que lo refleje
la app oficial. **La primera vez que eso ocurre, el producto tiene razón de
existir.**

## 5.7 Fase 5 — Premium y planificador *(8 a 10 semanas)*

Con el diferenciador funcionando, recién aquí tiene sentido monetizar.

- [ ] Suscripción premium: notificaciones inteligentes, Live Activity / widget,
      alertas recurrentes, historial personal (`07` §7.4)
- [ ] OpenTripPlanner 2 desplegado con el GTFS de Santiago (`03` §3.5)
- [ ] `/plan` como fachada, con UI de origen/destino
- [ ] **Integrar el motor en los resultados del planificador** — *"esta ruta usa
      la 506, que está desviada hace 20 minutos"*

Ese último punto es la razón de construir el planificador **después** del motor.
Un planificador que conoce el estado real de la red es un producto distinto de
uno que sólo lee horarios — y es lo único que justifica competir contra Google
Maps y Moovit en ese terreno.

## 5.8 Fase 6 — Datos agregados y expansión

- [ ] Agregación con k-anonimato (`07` §7.5)
- [ ] Publicación abierta de un subconjunto — prensa, usuarios y relación con el
      DTPM (`07` §7.5)
- [ ] Primeros contratos B2B
- [ ] Expansión a otras comunas, luego a otras ciudades con GTFS disponible
- [ ] Explorar recarga de Bip! (`07` §7.6)

## 5.9 Resumen temporal

| Fase | Duración | Acumulado | Qué se gana |
|---|---|---|---|
| F0 Validación | 2–4 sem | ~1 mes | Saber si el supuesto central se sostiene |
| F1 MVP + captura | 8–12 sem | ~4 meses | App útil y datos acumulándose |
| F2 Motor de inferencia | 8–12 sem | ~7 meses | La pieza técnica difícil |
| F3 Fusión | 4–6 sem | ~8,5 meses | ETA mejor que el oficial |
| F4 Detección de desvíos | 4–6 sem | ~10 meses | **El diferenciador** |
| F5 Premium + planificador | 8–10 sem | ~12 meses | Ingresos |
| F6 Datos agregados | — | — | El negocio |

Estimaciones para **una persona a tiempo completo**. A tiempo parcial,
multiplicar por dos o tres. Las fases 3 y 4 dependen además de alcanzar densidad
de usuarios, que no se controla trabajando más horas.

**La fase 2 es la de mayor riesgo de estimación.** Es investigación aplicada: si
el emparejamiento resulta más difícil de lo previsto, se alarga. F0-5 existe
precisamente para reducir esa incertidumbre antes de comprometerse.

## 5.10 Qué conviene hacer esta semana

1. **Enviar la solicitud al DTPM** (F0-3). Es lo más lento del plan y lo único
   que no avanza trabajando más horas.
2. **Grabar tres o cuatro viajes reales en micro** con un registrador GPS
   (F0-5) y mirar las trazas contra el trazado del GTFS. Es la validación más
   barata del supuesto más caro del proyecto.
3. **Descargar el GTFS y revisar su licencia** (F0-1, F0-2).
4. **Elegir la zona de lanzamiento** (F0-8) y el nombre definitivo (F0-7).
