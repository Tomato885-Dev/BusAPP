# 06 — Riesgos y decisiones pendientes

## 6.1 Riesgos ordenados por impacto

### R1 — No conseguir acceso a datos de posición en vivo 🔴 Crítico

**Probabilidad:** media-alta. **Impacto:** afecta la propuesta de valor completa.

Sin E₁ oficial de calidad, la fusión de `04` §4.3 pierde una de sus dos patas y
el sistema depende enteramente de la telemetría propia, que necesita densidad de
usuarios (R2).

*Mitigación:* iniciar la gestión con el DTPM en la primera semana (`05`, F0-3);
la telemetría propia es precisamente la vía de escape, y por eso es el núcleo
del producto y no un complemento.

### R2 — Densidad de usuarios 🔴 Crítico

**Probabilidad:** media. **Impacto:** anula el diferenciador.

La telemetría necesita gente a bordo. Es el problema del huevo y la gallina,
aunque **menos grave de lo que parece**: basta *una* persona a bordo para saber
dónde va ese bus, y con ~5% de penetración entre los pasajeros de un corredor se
cubre más del 90% de los buses en punta (`04` §4.7).

*Mitigación:* que la fase 1 sea buena por sí sola, sin depender de otros
usuarios; **concentrar el lanzamiento en un área acotada** para alcanzar densidad
local antes que cobertura amplia. **Es preferible ser la app dominante en Ñuñoa
que marginal en todo Santiago.**

### R2b — Que el emparejamiento de trazas no funcione 🔴 Crítico

**Probabilidad:** media. **Impacto:** el producto no tiene diferenciador.

Inferir en qué línea va un usuario es el problema técnico duro del proyecto
(`04` §4.5). En corredores con muchas líneas compartidas puede resultar
sencillamente ambiguo.

*Mitigación:* la prueba de terreno F0-5 del roadmap existe para detectarlo en la
primera semana, con un registrador GPS y sin escribir la app. Es la validación
más barata del supuesto más caro.

### R3 — Dependencia de fuentes no oficiales 🟠 Alto

**Probabilidad:** alta si se usan APIs comunitarias. **Impacto:** caída total del
servicio sin aviso previo.

*Mitigación:* la abstracción de fuentes de `01` §1.5; degradación elegante a
horario programado; monitoreo de disponibilidad con alertas.

### R4 — Rechazo en tiendas por ubicación en background 🟠 Alto

**Probabilidad:** media-alta. **Impacto:** semanas de retraso.

Sube de prioridad con el diseño pasivo: el background dejó de ser opcional, es
el mecanismo del producto.

*Mitigación:* no incluir background en el primer envío (`03` §3.8, `05` F1);
introducirlo en la fase 2 con historial y justificación demostrable; lanzar
primero en Play Store, cuya revisión es menos estricta, para validar antes de
enfrentar App Store.

### R4b — Consumo de batería 🟠 Alto

**Probabilidad:** alta si no se diseña con cuidado. **Impacto:** cada
desinstalación es un sensor menos, así que degrada el motor, no sólo la
retención.

*Mitigación:* muestreo adaptativo (`04` §4.9); medir el consumo desde la fase 1
y tratarlo como métrica de producto.

### R5 — Privacidad y cumplimiento legal 🟠 Alto

**Probabilidad:** media. **Impacto:** legal y reputacional.

Guardar trayectorias de transporte público es tratar datos personales sensibles
bajo la Ley 19.628 y su reforma.

*Mitigación:* las seis reglas de `03` §3.7 desde el diseño; asesoría legal antes
de activar la telemetría, no después.

### R6 — Conflicto de nombre 🟡 Medio

"Bus Checker" es prácticamente idéntico a **Transantiago Bus Checker**, una app
existente que el propio brief cita como referente. Riesgo de confusión, de
rechazo en App Store y eventualmente de marca.

*Mitigación:* definir un nombre propio en la fase 0 (F0-6), antes de invertir en
identidad visual, dominio o difusión.

### R7 — Costo de infraestructura 🟡 Medio

Servidor, base de datos, teselas de mapa y OpenTripPlanner cuestan dinero todos
los meses, desde antes de que haya un solo peso de ingreso. Las teselas de mapa
escalan con el uso y pueden volverse el costo dominante.

*Mitigación:* MapLibre con teselas open source en vez de Google Maps (`02`
§2.3); empezar en proveedores baratos; monitorear costo por usuario activo desde
el inicio.

### R8 — Competencia 🟡 Medio

Google Maps y Moovit tienen recursos incomparables. La ventaja posible no es
hacer más, sino hacer **una cosa mejor que nadie**: decir la verdad sobre si la
micro viene. Perder ese foco por agregar funcionalidades es el modo de fallar.

## 6.2 Decisiones pendientes

Ordenadas por urgencia. Las cuatro primeras bloquean el inicio del desarrollo.

**Resueltas el 19 de septiembre de 2026:**

| # | Decisión | Resultado |
|---|---|---|
| D1 | ¿Producto o aprendizaje? | ✅ **Producto para lanzar** |
| D2 | ¿Android además de iOS? | ✅ **Ambos, desde el mismo código** |
| D3 | Stack móvil | ✅ **React Native + Expo** (`02` §2.2c) |
| D4 | Stack backend | ✅ **Python + FastAPI + PostGIS** (`03` §3.3) |
| — | Presupuesto mensual | ✅ **USD 100** — la fase 1 cabe con holgura |

**Pendientes:**

| # | Decisión | Depende de | Documento |
|---|---|---|---|
| D5 | Nombre definitivo del producto | — | `06` R6 |
| D6 | Fuente de datos en vivo para la fase 1 | Respuesta del DTPM | `01` §1.2 |
| D7 | Proveedor de mapas: MapLibre / Google | Presupuesto | `02` §2.3 |
| D8 | ¿Publicidad desde el inicio o después? | Modelo de negocio | Brief §7 |
| D9 | Zona acotada de lanzamiento: ¿cuál? | Densidad, no cobertura | `04` §4.7 |
| D10 | ¿Los reportes manuales entran al producto? | Descartarlos simplifica mucho | `04` §4.11 |
| D11 | ¿Cómo se resuelve la ambigüedad de línea: automático o con confirmación de un toque? | Precisión vs. fricción | `04` §4.5 |

## 6.3 Supuestos de este diseño

Si alguno resulta falso, hay que revisar el plan:

1. El GTFS del DTPM se mantiene disponible y actualizado. *(Verificar en F0-1.)*
2. Su licencia permite uso en una app comercial o con publicidad. *(F0-2.)*
3. Las trazas GPS de usuarios permiten identificar el recorrido con precisión
   superior al 90%. *(F0-5, R2b. Es el supuesto más importante del proyecto.)*
4. El desarrollo lo realiza una persona o un equipo muy pequeño.
5. No hay presupuesto significativo para adquisición de usuarios.
6. El horizonte de desarrollo es de meses, no de semanas.

## 6.4 Qué haría fracasar este proyecto

Dicho sin rodeos, porque es más útil que una lista de buenas prácticas:

- **Construir las cuatro funcionalidades a medias** en vez de una excelente.
  Es el modo de fallo más probable, porque se siente como progreso.
- **Saltarse la prueba de terreno F0-5** y descubrir en el mes seis que las
  trazas GPS no permiten identificar el recorrido.
- **Encender la fusión con un emparejamiento malo**, contaminando el ETA con
  telemetría equivocada y quedando peor que la app oficial.
- **Dispersarse por todo Santiago** en vez de concentrar densidad en una zona.
- **Mostrar un ETA falso con apariencia de certeza.** Es exactamente el problema
  que el producto dice venir a resolver; cometerlo lo deja sin razón de ser.
- **Postergar la solicitud al DTPM** porque no es una tarea de programación.
- **Elegir iOS-only** y descubrir en el mes ocho que el diferenciador necesita
  usuarios que están en Android. *(Evitado: D2 resuelta a favor de ambas.)*
