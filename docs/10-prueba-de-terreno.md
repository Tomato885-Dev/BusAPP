# 10 — Prueba de terreno: grabar viajes reales

> **Para qué sirve esto.** Todo Kupay descansa sobre un supuesto que nadie ha
> comprobado: que con el GPS de un teléfono metido en una micro se puede deducir
> **en qué recorrido va esa micro**. Si funciona, el producto no tiene
> competencia. Si no funciona, Kupay muestra los mismos datos de red.cl que
> todas las demás apps y no hay negocio.
>
> Esta es la única tarea que puede matar el proyecto, y la única que no se puede
> hacer desde un computador.

No hace falta auto, ni salir a propósito, ni desviarse del recorrido habitual.
**Se graba en los viajes que ya ibas a hacer igual.**

---

## Paso 1 — Instalar la app de registro

En iPhone, en orden de preferencia:

| App | Por qué |
|-----|---------|
| **Open GPX Tracker** | Gratis, sin cuenta, sin publicidad. Guarda el dato crudo, que es justo lo que sirve |
| **Strava** | Gratis. Sirve igual y es más fácil de usar, pero suaviza un poco el recorrido |

> ⚠️ No pude comprobar las fichas de la App Store desde el entorno de
> desarrollo. Si ninguna de las dos aparece, sirve **cualquier app que exporte
> archivos `.gpx`** — búscalo así: *"GPX tracker"*.

**Permiso de ubicación:** al instalarla, dale **«Siempre»**, no «Mientras uso la
app». Si le das el segundo, deja de grabar en cuanto bloqueas la pantalla y el
viaje queda cortado.

---

## Paso 2 — El viaje de prueba (hazlo una vez, antes de los de verdad)

Antes de grabar viajes reales, **comprueba que la app graba con el teléfono
bloqueado**. Es el error que arruina los datos y no se nota hasta el final.

1. Aprieta **Grabar**
2. **Bloquea la pantalla** y guarda el teléfono en el bolsillo
3. Camina 5 minutos
4. Saca el teléfono y aprieta **Parar**

Si el recorrido dibujado son 5 minutos de caminata, funciona. Si son dos puntos
sueltos o está vacío, el permiso quedó mal: revisa el Paso 1.

---

## Paso 3 — Grabar, y esto es lo importante

El instinto es apretar *Grabar* al sentarse en la micro. **Eso echa a perder la
mitad del valor del dato.**

Kupay, en la vida real, no sabe cuándo te subiste. Tiene que deducirlo sola,
mirando cómo cambia tu movimiento. Para poder probar eso, la grabación tiene que
incluir el **antes** y el **después**:

```
  ▶ GRABAR  ──┐
              │  caminando al paradero      ← el algoritmo aprende cómo se ve caminar
              │  esperando en el paradero   ← aprende cómo se ve estar detenido
              │  ARRIBA DE LA MICRO         ← el dato principal
              │  caminando a donde vas      ← aprende a detectar que te bajaste
  ⏹ PARAR   ──┘
```

**En concreto:**

- **Aprieta Grabar antes de salir**, o al menos al empezar a caminar al paradero
- **Aprieta Parar después de bajarte**, cuando ya llevas un par de minutos
  caminando

Ese par de minutos de caminata antes y después valen tanto como el viaje mismo.

**Dónde llevar el teléfono:** en el bolsillo está bien. Si te toca ir sentado
junto a la ventana, mejor todavía — el GPS recibe peor en el centro de la micro.
No es obligatorio; no cambies de asiento por esto.

---

## Paso 4 — Anotar tres cosas

Sin esto los archivos **no sirven**, porque no tengo con qué comparar el
resultado del algoritmo. Es lo que en estadística se llama *verdad de terreno*:
la respuesta correcta contra la que se mide si el sistema acertó.

Anota en las notas del teléfono, o en un papel:

```
1. Recorrido:  506
2. Desde:      paradero frente al mall, Av. Providencia
3. Hasta:      paradero de la universidad
```

**El número del recorrido es lo esencial.** Los otros dos pueden ser
aproximados: «desde mi casa» y «hasta la U» me sirven, porque la hora ya viene
dentro del archivo.

Si te subiste a una micro y **no alcanzaste a ver el número**, dímelo igual y
anota «no sé». Ese caso también es información.

---

## Paso 5 — Cuántos viajes

**Primera ronda: 3 viajes.** No 15.

Con 3 ya puedo decirte si esto va por buen camino o si hay que replantear todo.
Prefiero mirar 3 esta semana que esperar 15 que no llegan nunca.

Si los 3 se ven bien, seguimos hasta unos 10–12, y ahí la respuesta es
definitiva.

**Para la segunda ronda, mientras más variedad mejor:**

- [ ] Recorridos **distintos** entre sí (4 o 5 números diferentes)
- [ ] El **mismo** recorrido repetido 2 o 3 veces — sirve para ver si el
      resultado es estable o sale distinto cada vez
- [ ] Al menos uno en **hora punta**, con la micro llena
- [ ] Al menos uno de **noche** o fin de semana, con calles despejadas

Un viaje en Metro, si te toca, también me sirve: Kupay tiene que aprender a **no
confundir** el Metro con una micro.

---

## Paso 6 — Mandar los archivos

Exporta cada viaje como **`.gpx`** y súbelos a la carpeta `datos-terreno/` del
repositorio, o déjalos en Drive y pásame el enlace.

Ponles nombre así, para no perder el hilo:

```
2026-09-22_506_a-la-u.gpx
2026-09-22_210_vuelta.gpx
```

---

## Qué hago yo con esto

Cuando lleguen los archivos:

1. Paso cada recorrido por el algoritmo de identificación, **sin decirle la
   respuesta**
2. Comparo lo que dedujo contra lo que anotaste
3. Te entrego un número concreto: *«acertó el recorrido en X de Y viajes, y
   demoró Z minutos en darse cuenta»*

Ese número decide el futuro del proyecto:

| Resultado | Qué significa |
|-----------|---------------|
| **Acierta casi siempre, rápido** | El producto es viable tal como está pensado. Se sigue adelante |
| **Acierta, pero lento o a medias** | Hay que ajustar el algoritmo, no la idea |
| **No acierta** | El diferenciador no se sostiene. Hay que replantear qué vende Kupay **antes** de gastar en cuentas de desarrollador |

Las tres respuestas son útiles. La peor de todas es no tener ninguna.
