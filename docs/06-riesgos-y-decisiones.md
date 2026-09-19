# 06 — Riesgos y decisiones pendientes

## 6.1 Riesgos ordenados por impacto

### R1 — No conseguir acceso a datos de posición en vivo 🔴 Crítico

**Probabilidad:** media-alta. **Impacto:** afecta la propuesta de valor completa.

Sin posiciones GPS, Bus Checker no puede detectar desvíos automáticamente y
depende por entero de los reportes de usuarios, que a su vez dependen de tener
usuarios (R2). Es la dependencia más importante del proyecto.

*Mitigación:* iniciar la gestión con el DTPM en la primera semana (`05`, F0-3);
diseñar el producto para ser útil sin ese dato; desarrollar la telemetría de
usuarios como vía alternativa (`01` §1.4).

### R2 — Masa crítica de usuarios 🔴 Crítico

**Probabilidad:** alta. **Impacto:** anula el diferenciador.

El componente comunitario tiene el problema clásico del huevo y la gallina. Y
compite contra apps instaladas y gratuitas con años de ventaja.

*Mitigación:* que la fase 1 sea buena por sí sola, sin depender de otros
usuarios; concentrar el lanzamiento en un área geográfica acotada (una comuna,
un corredor) para alcanzar densidad local antes que cobertura amplia. **Es
preferible ser la app dominante en Ñuñoa que ser marginal en todo Santiago.**

### R3 — Dependencia de fuentes no oficiales 🟠 Alto

**Probabilidad:** alta si se usan APIs comunitarias. **Impacto:** caída total del
servicio sin aviso previo.

*Mitigación:* la abstracción de fuentes de `01` §1.5; degradación elegante a
horario programado; monitoreo de disponibilidad con alertas.

### R4 — Rechazo en App Store por ubicación en background 🟠 Alto

**Probabilidad:** media. **Impacto:** semanas de retraso.

*Mitigación:* no incluir background en el primer envío (`03` §3.8); textos de
permiso explícitos; la app debe funcionar sin el permiso.

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

| # | Decisión | Depende de | Documento |
|---|---|---|---|
| D1 | ¿Producto o proyecto de aprendizaje? | Sólo del objetivo personal | `02` §2.5 |
| D2 | ¿Se acepta Android en fase 2? | D1 | `02` §2.1 |
| D3 | Stack móvil: Flutter / React Native / Swift | D1, D2 | `02` §2.3 |
| D4 | Stack backend: Python / Node | D3, experiencia previa | `03` §3.3 |
| D5 | Nombre definitivo del producto | — | `06` R6 |
| D6 | Fuente de datos en vivo para la fase 1 | Respuesta del DTPM | `01` §1.2 |
| D7 | Proveedor de mapas: MapLibre / Google | Presupuesto | `02` §2.3 |
| D8 | ¿Publicidad desde el inicio o después? | Modelo de negocio | Brief §7 |
| D9 | ¿Lanzamiento acotado a una zona o a todo Santiago? | Estrategia de masa crítica | `06` R2 |

## 6.3 Supuestos de este diseño

Si alguno resulta falso, hay que revisar el plan:

1. El GTFS del DTPM se mantiene disponible y actualizado. *(Verificar en F0-1.)*
2. Su licencia permite uso en una app comercial o con publicidad. *(F0-2.)*
3. Existe una vía —oficial o propia— para obtener posiciones de buses. *(F0-3, R1.)*
4. El desarrollo lo realiza una persona o un equipo muy pequeño.
5. No hay presupuesto significativo para adquisición de usuarios.
6. El horizonte de desarrollo es de meses, no de semanas.

## 6.4 Qué haría fracasar este proyecto

Dicho sin rodeos, porque es más útil que una lista de buenas prácticas:

- **Construir las cuatro funcionalidades a medias** en vez de una excelente.
  Es el modo de fallo más probable, porque se siente como progreso.
- **Lanzar los reportes sin usuarios** y quemar el diferenciador.
- **Mostrar un ETA falso con apariencia de certeza.** Es exactamente el problema
  que el producto dice venir a resolver; cometerlo lo deja sin razón de ser.
- **Postergar la solicitud al DTPM** porque no es una tarea de programación.
- **Elegir iOS-only** y descubrir en el mes ocho que el diferenciador necesita
  usuarios que están en Android.
