# 11 — Funciones premium

## La regla que ordena todo

> **Saber cuándo llega tu micro es, y seguirá siendo, gratis.**
> Lo que se cobra es que **la información te busque a ti**.

Esta regla no es un eslogan, es un criterio de decisión. Cada vez que hay que
resolver si algo va en el plan gratis o en el pagado, la pregunta es una sola:

- ¿El usuario **abre la app y pregunta**? → **gratis**, siempre.
- ¿La app **le avisa sin que pregunte**, o **actúa por él**? → **premium**.

Cobrar por saber si viene la micro sería cobrarle a alguien por no quedarse
esperando en la calle. Eso no se hace. Además destruiría el producto: la
telemetría necesita usuarios, y un muro de pago en la función central deja a la
app sin la masa que la hace funcionar (`04` §4.6).

---

## Plan gratis

Todo lo que responde una pregunta hecha por el usuario:

- El mapa completo, con todos los paraderos de la zona
- Llegadas en cualquier paradero, con su rango de incertidumbre
- El aviso de desvío **cuando el usuario mira ese paradero**
- El planificador de viajes
- **3 favoritos**
- **1 rutina**

Los dos límites no son arbitrarios: uno de cada cosa alcanza para el viaje
principal de cualquier persona. Quien necesita más es, por definición, quien le
saca más provecho a la app.

---

## Plan premium

### 1. Rutinas ilimitadas

Ida y vuelta, distintos días, distintos paraderos. La vida real de alguien que
estudia y trabaja no cabe en una sola rutina.

### 2. Aviso de salida

No «tu micro llega en 7 minutos», sino **«sal en 3 minutos»**.

La diferencia es todo el producto. La app sabe a cuánto estás caminando del
paradero, y resta. Nadie quiere calcular eso corriendo.

### 3. Modo viaje — «avísame antes de bajarme» ⭐

Vas arriba de la micro. Le dices dónde te bajas. La app te avisa **dos paraderos
antes**.

Es la función que más pide alguien que va con el teléfono, con audífonos, o que
no conoce el recorrido. Y es la única de la lista que **resuelve un problema
distinto al de esperar**: el de pasarse.

De paso, es la función que más telemetría de calidad genera, porque el usuario
**declara** en qué recorrido va. Eso es verdad de terreno regalada (`04` §4.7).

### 4. Alertas de desvío en tus favoritos

Si un recorrido del que dependes se desvía, te enteras **sin abrir la app**.

Es el diferenciador del producto convertido en algo que trabaja para ti mientras
haces otra cosa.

### 5. Favoritos ilimitados

### 6. Tus números

Cuánto esperaste este mes, qué recorrido te falla más, cuántas horas llevas
esperando micros. Son datos que el usuario genera; devolvérselos es lo mínimo.

Se apoya en `mis_estadisticas()`, ya definida en el esquema (`servidor/`).

### 7. Widget en la pantalla de inicio, Apple Watch, Live Activities

**Bloqueadas.** Requieren cuentas de desarrollador de Apple y Google, que aún no
existen. Los widgets además se escriben en SwiftUI y Kotlin, no en React Native.

Lo que sí está construido es toda la lógica que van a consumir: qué micros vienen
al paradero de tu rutina, 15 minutos antes de tu hora. La tarjeta de rutina
dentro de la app es esa misma función, esperando carcasa.

---

## Lo que nunca va a ser premium

Dejarlo escrito sirve para no tener que discutirlo cada vez que falte plata:

- Ver si una micro viene o no viene
- El aviso de desvío del paradero que estás mirando
- La precisión de la estimación

Degradar a propósito la información de un plan gratis para empujar al pago es
justamente lo que hace odiables a las apps que Kupay quiere reemplazar.

---

## Nota de seguridad

La tabla `suscripciones` es **de sólo lectura** desde el cliente. Sólo la escribe
el servidor, cuando la tienda confirma un pago.

Si la app pudiera escribirla, cualquiera se regalaría premium modificando la
petición desde el navegador. Es el error más común y más caro de las apps con
suscripción.
