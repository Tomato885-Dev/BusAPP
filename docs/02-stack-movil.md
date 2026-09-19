# 02 — Elección de stack móvil

El brief plantea la app como iOS-first. Antes de comparar frameworks, hay que
cuestionar ese supuesto, porque condiciona todo lo demás.

## 2.1 El argumento contra iOS-only

El diferenciador de Bus Checker no es técnico, es **social**: reportes de
usuarios, ubicación compartida, detección comunitaria de desvíos. Ese mecanismo
tiene una propiedad incómoda: **no funciona un poco con pocos usuarios; no
funciona en absoluto**.

Si en un paradero hay 40 personas esperando y 2 usan la app, nunca habrá
reportes suficientes para afirmar "la 506 está desviada". La funcionalidad no
se degrada proporcionalmente, simplemente no existe hasta cruzar un umbral.

Ahora súmale la realidad del mercado chileno: **Android es ampliamente
mayoritario**, del orden de 3 de cada 4 dispositivos (cifra aproximada de
mediciones tipo StatCounter; conviene verificarla al momento de decidir). Y el
sesgo es más fuerte todavía en el segmento que más usa transporte público.

La conclusión es incómoda pero clara:

> Lanzar sólo en iOS significa construir un producto cuyo diferenciador depende
> de masa crítica, renunciando de entrada a la mayor parte del mercado —y a la
> parte del mercado que más lo necesita.

Esto no obliga a lanzar ambas plataformas el mismo día. Sí obliga a **no elegir
un stack que convierta Android en una reescritura completa**.

**Recomendación:** iOS puede ser la primera plataforma en salir. No debería ser
la única que el código soporta.

## 2.2 Comparación de opciones

Lo que esta app le exige al cliente:

1. Mapa con muchos marcadores (paraderos) y polilíneas (recorridos), fluido.
2. Ubicación en primer plano, y **en segundo plano** para la telemetría (`01`, §1.4).
3. Listas que se actualizan cada pocos segundos sin parpadeos.
4. Caché local del GTFS para funcionar con mala señal o sin conexión.
5. Consumo de batería bajo. *Una app de transporte que gasta batería se desinstala.*
6. Notificaciones push.

| Criterio | Swift / SwiftUI | Flutter | React Native (Expo) | Kotlin Multiplatform |
|---|---|---|---|---|
| **Cobertura del mercado con un código** | Sólo iOS ❌ | iOS + Android ✅ | iOS + Android ✅ | iOS + Android (lógica) ⚠️ |
| **Calidad del mapa** | MapKit, excelente | Muy buena (MapLibre / Google Maps) | Buena (`react-native-maps`, nativo) | Nativa en cada plataforma ✅ |
| **Ubicación en background** | Nativo, el mejor control ✅ | Buena, vía plugins maduros | Buena con `expo-location` + tareas | Nativa ✅ |
| **Consumo de batería** | Óptimo ✅ | Bueno | Aceptable | Óptimo ✅ |
| **Velocidad de desarrollo** | Media | Alta ✅ | Alta ✅ | Baja ❌ |
| **UI idéntica entre plataformas** | N/A | Sí (se pinta a sí misma) | Cercana a nativa | No (dos UIs) |
| **Costo de sumar Android** | Reescritura total ❌ | ~0 ✅ | ~0 ✅ | Sólo la UI ⚠️ |
| **Curva para un dev solo** | Media | Media | Baja si ya sabes JS | Alta ❌ |
| **App de Apple Watch** | Nativa ✅ | Módulo Swift aparte ⚠️ | Módulo Swift aparte ⚠️ | Nativa ✅ |
| **Riesgo de dependencias** | Bajo ✅ | Medio | Medio-alto (muchos paquetes) | Bajo |

## 2.2b Apple Watch (y Wear OS): lo que hay que saber antes de elegir

**Requisito confirmado del producto:** la app debe funcionar en Apple Watch, con
avisos de llegada.

Esto tiene una consecuencia que conviene conocer antes de decidir el stack:

> **Ni Flutter ni React Native compilan a watchOS.** La app de reloj hay que
> escribirla en Swift/SwiftUI, sea cual sea el framework que se use para el
> teléfono. Lo mismo ocurre en Android: Wear OS se escribe en Kotlin.

A primera vista esto favorece a Swift nativo. Pero mirado de cerca, casi no
cambia nada, por una razón:

**La app de reloj es un cliente delgado.** No necesita el motor de estimación, ni
el mapa, ni la telemetría, ni el planificador. Necesita exactamente dos cosas:
las próximas llegadas de un paradero favorito, y recibir un aviso. Desde
watchOS 6 las apps de reloj tienen **acceso de red propio**, así que puede
consultar la API directamente sin pasar por el teléfono.

Es decir: es una app pequeña contra un endpoint que ya existe. Del orden de una
o dos semanas de trabajo, no una reimplementación.

Comparación del trabajo total con el requisito de reloj incluido:

| Stack | Teléfono | Reloj | Total |
|---|---|---|---|
| **Flutter / RN** | 1 código para iOS + Android | SwiftUI (+ Kotlin si se quiere Wear OS) | **2 a 3 piezas** |
| **Swift nativo** | Swift (iOS) + Kotlin (Android) | SwiftUI (+ Kotlin Wear OS) | **3 a 4 piezas** |

La recomendación de §2.3 se mantiene. Lo que cambia es que hay que **presupuestar
un módulo nativo de reloj** en el plan, y que esto **refuerza la decisión de
diseñar la API primero**: el reloj es simplemente otro consumidor de
`/stops/{id}/arrivals` (`03` §3.6). Una arquitectura donde la lógica vive en el
servidor y los clientes son delgados hace que sumar el reloj sea barato; una
donde la lógica vive en la app obligaría a reimplementarla.

## 2.3 Recomendación

### Flutter, salvo que se cumpla una de las excepciones de §2.4.

Razones, en orden de peso:

1. **Resuelve el problema de cobertura sin duplicar trabajo.** Es el único
   criterio que afecta directamente la viabilidad del producto, no sólo su
   comodidad de desarrollo.
2. **Rendimiento suficiente y predecible** para mapas con muchos marcadores y
   listas que se refrescan, que es el 90% de esta app.
3. **Una sola implementación de la lógica delicada.** El manejo de permisos de
   ubicación, la caché de GTFS, el reintento ante red inestable y el muestreo
   de telemetría son piezas fáciles de equivocar. Escribirlas dos veces es
   duplicar la superficie de bugs, no sólo el esfuerzo.
4. **La complejidad real del proyecto está en el backend**, no en el cliente
   (ver `03` y `04`). Conviene gastar el presupuesto de dificultad ahí y
   mantener el cliente lo más simple posible.

Decisiones concretas sugeridas dentro de Flutter:

- **Mapa:** MapLibre GL (`maplibre_gl`) con teselas propias o de un proveedor
  open source. Evita el costo por carga de Google Maps, que escala mal si la app
  crece. Google Maps es alternativa razonable si se prefiere velocidad inicial
  sobre costo futuro.
- **Estado:** Riverpod. Adecuado para datos que llegan por streams y se
  invalidan por tiempo, que es exactamente el caso de las llegadas.
- **Caché local:** SQLite (`drift`) con el GTFS precargado. Permite búsquedas
  geográficas de paraderos cercanos sin red.
- **Ubicación:** empezar con `geolocator` para primer plano. Postergar el
  background hasta la fase que realmente lo necesita (ver roadmap).

### Sobre React Native

Es una elección perfectamente defendible y llega casi al mismo resultado.
Elígela si ya trabajas con JavaScript/TypeScript: la ventaja de escribir en un
lenguaje que dominas supera a las diferencias técnicas entre ambos frameworks
para esta aplicación. Expo simplifica de forma notable los permisos, las
notificaciones y las actualizaciones over-the-air.

El punto en contra frente a Flutter es la mayor dependencia de paquetes de
terceros para funciones sensibles —ubicación en background, sobre todo— y una
superficie de mantenimiento algo mayor.

### Sobre Swift nativo

Da el mejor resultado en la plataforma en que corre. El problema no es técnico
sino estratégico: **cada mes invertido en una base iOS-only es un mes que no
acerca el producto a la masa crítica que su diferenciador necesita**.

## 2.4 Cuándo sí elegir Swift nativo

La recomendación se invierte si se cumple alguna de estas condiciones:

- **El objetivo real es aprender desarrollo iOS.** Es un objetivo legítimo, y
  entonces el stack correcto es el nativo. Sólo conviene tenerlo explícito, para
  no confundir un proyecto de aprendizaje con un proyecto de producto.
- **Se decide deliberadamente construir sólo la app de horarios y mapas**,
  renunciando al componente comunitario. Sin crowdsourcing, la masa crítica deja
  de ser un requisito y iOS-only vuelve a ser viable.
- **Existe ya acceso confirmado a los datos oficiales de GPS** (escenario A de
  `01`, §1.3). En ese caso el producto puede ser excelente desde el día uno sin
  depender de usuarios, y la cobertura de mercado pasa a ser una decisión
  comercial en vez de una condición de funcionamiento.

## 2.5 Lo que hay que decidir antes de escribir código

- [ ] **¿Producto o proyecto de aprendizaje?** Determina todo lo anterior.
- [ ] **¿Se acepta Android en fase 2, o se descarta definitivamente?**
- [ ] ¿Con qué lenguaje se trabaja más cómodo: Dart, TypeScript o Swift?
- [ ] ¿Presupuesto disponible para servicios de mapas, o se prioriza open source?
- [ ] ¿El reloj entra sólo en Apple Watch, o también Wear OS? (ver §2.2b)

Estas cuatro respuestas definen el stack. El resto es detalle de implementación.
