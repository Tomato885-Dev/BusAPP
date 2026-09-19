# 05 — Roadmap

## 5.1 Sobre el alcance del MVP

Al priorizar, se marcaron las cuatro funcionalidades: llegadas en paradero,
planificador de viajes, reportes de usuarios y mapa con recorridos. Es una
respuesta comprensible —las cuatro son necesarias para el producto final— pero
las cuatro juntas no pueden ser el MVP, y conviene explicar por qué antes de
proponer un orden.

**Los reportes de usuarios no pueden ir en el MVP por una razón estructural, no
de esfuerzo:** un sistema de reportes sin usuarios no muestra nada. Si se lanza
el día uno, el usuario ve una pantalla vacía, concluye que la función no sirve y
no vuelve a abrirla. La función se quema antes de tener la oportunidad de
funcionar. Necesita una base de usuarios que sólo puede construir otra cosa.

**El planificador de viajes compite consigo mismo.** Google Maps y Moovit ya lo
hacen bien y llevan años puliéndolo. Un planificador apenas correcto no atrae a
nadie, y uno excelente cuesta meses. Además, gracias a OpenTripPlanner (`03`,
§3.5) su costo *baja* si se construye después —el GTFS ya estará ingestado y la
infraestructura montada. Es de las pocas cosas que conviene postergar porque
postergarla la abarata.

**El mapa sí entra temprano**, pero como soporte de las llegadas (ubicar el
paradero, ver el trazado), no como funcionalidad independiente.

> **La secuencia que se propone:** las llegadas en paradero traen usuarios →
> los usuarios hacen viables los reportes → los reportes producen el
> diferenciador → el diferenciador justifica el planificador y la expansión.
>
> Invertir ese orden hace que ninguna pieza funcione.

## 5.2 Fase 0 — Validación *(2 a 4 semanas, sin escribir código de producto)*

Es la fase que se siente como pérdida de tiempo y es la que más tiempo ahorra.

| # | Tarea | Por qué importa |
|---|---|---|
| F0-1 | Descargar el GTFS vigente, validarlo, cargarlo en PostGIS | Confirma que el dato base existe y es utilizable |
| F0-2 | **Leer la licencia del GTFS para uso comercial** | Puede condicionar el modelo de negocio completo |
| F0-3 | **Enviar la solicitud de acceso al DTPM** | Trámite lento: cada semana de demora en enviarlo es una semana de retraso del escenario A |
| F0-4 | Prototipo desechable: consultar llegadas de un paradero real | Verifica de punta a punta que el dato en vivo se puede obtener |
| F0-5 | Decidir stack (`02`, §2.5) y confirmar si Android entra | Cambiarlo después es carísimo |
| F0-6 | Definir el nombre y verificar disponibilidad en App Store | "Bus Checker" se parece demasiado a "Transantiago Bus Checker", una app existente. Hay riesgo de confusión y de marca. |

**Criterio para avanzar:** saber con certeza qué datos se tendrán y bajo qué
condiciones. Si la respuesta es "sólo GTFS estático", el plan sigue siendo
válido, pero hay que asumir el escenario B/C de `01` §1.3 y ajustar las promesas
del producto en consecuencia.

## 5.3 Fase 1 — MVP: llegadas en paradero *(6 a 10 semanas)*

**Una pantalla, hecha muy bien.** El usuario abre la app y en menos de tres
segundos ve qué micros vienen a su paradero.

Backend:
- [ ] Ingesta del GTFS a PostGIS, con actualización programada
- [ ] `GET /v1/stops/nearby` — búsqueda geográfica
- [ ] `GET /v1/stops/{id}/arrivals` — con el contrato de `03` §3.6 **completo desde el inicio**, incluidos `confidence`, `source` y `status`, aunque en esta fase sólo devuelvan valores básicos
- [ ] Adaptador de fuente en vivo, detrás de la abstracción de `01` §1.5
- [ ] **Registro de `arrival_history` desde el primer día** — los datos no capturados hoy no se recuperan
- [ ] Registro de predicciones para medir error (`04` §4.7)

App:
- [ ] Permiso de ubicación (sólo en uso; **nada de background todavía**, ver `03` §3.8)
- [ ] Lista de paraderos cercanos
- [ ] Pantalla de llegadas con actualización automática
- [ ] Búsqueda de paradero por código o nombre — funciona sin permiso de ubicación
- [ ] Favoritos, en almacenamiento local (sin cuentas de usuario todavía)
- [ ] Estados vacíos y de error honestos: "sin datos en vivo" es una respuesta legítima

Fuera de alcance en esta fase: mapa, planificador, reportes, cuentas, push,
publicidad.

**Criterio para avanzar:** una persona usa la app en su paradero habitual durante
dos semanas y la prefiere a la que usaba antes. Si no ocurre, el problema está
en esta pantalla y ninguna funcionalidad adicional lo va a arreglar.

## 5.4 Fase 2 — Mapa, recorridos y confianza *(4 a 6 semanas)*

- [ ] Mapa con paraderos y ubicación del usuario
- [ ] Trazado completo de cada recorrido (desde `shapes` del GTFS)
- [ ] Posición de los buses en el mapa, si la fuente lo permite
- [ ] **Indicadores de confianza visibles en la UI** — que el usuario distinga entre "sabemos" y "estimamos"
- [ ] Caché offline del GTFS en SQLite
- [ ] Alertas oficiales de servicio, si están disponibles

Aquí la app deja de ser una lista y pasa a ser una herramienta de orientación,
que es lo que se necesita en un lugar desconocido.

## 5.5 Fase 3 — Reportes comunitarios *(6 a 8 semanas)*

**Requisito de entrada: una base de usuarios activos suficiente para que un
paradero cualquiera tenga varios usuarios en hora punta.** Sin eso, esta fase no
se lanza —se posterga. Lanzarla antes de tiempo quema la función.

- [ ] Cuentas de usuario (mínimas: bastan identificadores anónimos persistentes)
- [ ] Envío de reportes con validación geográfica
- [ ] Confirmación y desmentido de reportes ajenos
- [ ] Sistema de reputación (`04` §4.6)
- [ ] Agregador de evidencia (`04` §4.4)
- [ ] Estados `SOSPECHA_DESVIO` / `DESVIADO` / `NO_LLEGARA` en la API y en la UI
- [ ] Moderación y límites de frecuencia

**Criterio de éxito:** el motor detecta correctamente un desvío real antes de
que lo refleje la app oficial. La primera vez que eso ocurre, el producto tiene
razón de existir.

## 5.6 Fase 4 — Planificador de viajes *(4 a 6 semanas)*

- [ ] Desplegar OpenTripPlanner 2 con el GTFS de Santiago
- [ ] `GET /v1/plan` como fachada sobre OTP
- [ ] UI de origen/destino con autocompletado
- [ ] Resultados con transbordos, caminatas y alternativas
- [ ] **Integrar el motor de estimación en los resultados** — es lo que ningún
      competidor hace: "esta ruta usa la 506, que está desviada hace 20 minutos"

Ese último punto es la razón de construir el planificador *después* del motor y
no antes. Un planificador que conoce el estado real de la red es un producto
distinto de uno que sólo lee horarios.

## 5.7 Fase 5 — Telemetría y predicción avanzada

- [ ] Ubicación en background, opt-in explícito, con toda la protección de `03` §3.7
- [ ] Inferencia de "usuario a bordo de la línea X"
- [ ] Señal S5 incorporada al agregador
- [ ] Modelo predictivo sobre el histórico acumulado
- [ ] Notificaciones push ("tu micro llega en 5 min", "tu línea está desviada")

Esta fase es la que puede independizar al producto del acceso oficial a datos.
También es la de mayor riesgo regulatorio y de revisión de App Store, y por eso
va al final: para entonces la app tiene historial, usuarios y una justificación
demostrable del permiso.

## 5.8 Fase 6 — Expansión

Android (trivial si se eligió cross-platform, reescritura si no), otras ciudades
de Chile con GTFS disponible, versión premium.

## 5.9 Resumen temporal

| Fase | Duración estimada | Acumulado |
|---|---|---|
| F0 Validación | 2–4 sem | ~1 mes |
| F1 MVP llegadas | 6–10 sem | ~3,5 meses |
| F2 Mapa y recorridos | 4–6 sem | ~5 meses |
| F3 Reportes | 6–8 sem | ~7 meses |
| F4 Planificador | 4–6 sem | ~8,5 meses |
| F5 Telemetría | 8–12 sem | ~11 meses |

Estimaciones para **un desarrollador trabajando a tiempo completo**. A tiempo
parcial, multiplicar por dos o tres. Las fases 3 y 5 dependen además de tener
usuarios, lo que no se controla con esfuerzo de desarrollo.

## 5.10 Las tres cosas que conviene hacer esta semana

1. **Enviar la solicitud al DTPM** (F0-3). Es lo más lento del plan y lo único
   que no avanza trabajando más horas.
2. **Descargar el GTFS y revisar su licencia** (F0-1, F0-2). Determina si el
   proyecto es viable tal como está planteado.
3. **Responder las cuatro preguntas de `02` §2.5.** Sin ellas no se puede
   escribir la primera línea de código con confianza.
