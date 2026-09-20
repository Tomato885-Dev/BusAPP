# 14 — Emparejar una traza GPS con un recorrido

Responde la pregunta de la que depende el producto entero: **¿se puede saber en
qué micro va una persona mirando sólo el GPS de su teléfono?**

Si la respuesta es no, no hay telemetría propia (`01` §1.4), no hay detección de
desvíos, no hay diferenciador y no hay dato que vender. Es el supuesto 3 de `06`
§6.3 y el riesgo R2b, y hasta ahora nunca se había tocado.

El código está en `backend/trazas/`, y está escrito **antes** de tener las
trazas reales a propósito: el día que lleguen los `.gpx` la respuesta sale en
minutos, no en una semana.

---

## 1. Cómo se decide

«La traza pasa cerca de este trazado» no sirve: en Alameda pasan cerca cuarenta
recorridos, y un auto por la misma calle pasa igual de cerca que la micro.
Hacen falta tres señales, y la tercera es la que distingue de verdad.

| Señal | Qué mide | Qué descarta |
|---|---|---|
| **Cobertura** | Qué parte de la traza cae a menos de 35 m del trazado | Lo que no tiene nada que ver |
| **Avance** | Cuánto progresó *a lo largo* del trazado, sin retroceder | Al auto que **cruza** la avenida en vez de ir **por** ella |
| **Paradas** | Concordancia entre dónde se detuvo la traza y dónde están los paraderos | Al que va por la misma calle **sin ser una micro** |

La tercera es la importante, y también la más cara de falsear.

### Las paradas se miden en las dos direcciones

No basta con «en cuántos de sus paraderos paró». Eso premia a las variantes
expresas: parar en los 5 paraderos de la 506e es más fácil que parar en los 18
de la 506, y **medido contra el feed real, la expresa le ganaba siempre a la
506 en un viaje generado sobre la 506.**

Se mide además cuántas de las detenciones observadas **explica** el recorrido, y
se combina con una media armónica. Así la expresa pierde: deja trece
detenciones sin explicar.

### Una detención es permanencia, no velocidad baja

Se pide estar **12 segundos dentro de 40 metros**, no «ir lento». Un auto a
35 km/h cruza esos ochenta metros en siete segundos; una micro que abre las
puertas se queda veinticinco o más. Ése es todo el margen y alcanza.

La primera versión medía velocidad baja cerca del paradero, y en realidad
estaba midiendo *pasar por al lado*: a 6 m/s uno está a menos de 45 m de un
paradero durante 15 segundos sin haberse detenido nunca.

---

## 2. Qué se midió

Contra el feed real del DTPM (12.880 paraderos, 736 recorridos con sentido),
con un viaje de 10 paraderos simulado sobre 60 recorridos al azar:

| | |
|---|---|
| El recorrido correcto sale **primero** | **75%** |
| El correcto está en el **grupo empatado** | **93%** |
| El sistema **se atreve** a dar una respuesta | **50%** |

Se vuelve a medir con:

```sh
cd backend && python -m trazas.cli medir --muestra 60
```

### Lo que estos números **no** dicen

> Las trazas son sintéticas y están generadas con **los mismos trazados** contra
> los que después se comparan. Esto es el mejor caso posible, no una predicción.

El ruido real del GPS urbano no se parece al simulado: rebota en los edificios,
se va en bloque durante media cuadra y vuelve de golpe. Y una micro real se
detiene donde no hay paradero y se salta paraderos donde no hay nadie.

**La cifra que vale es la de las trazas grabadas a mano** (`10`). Éstas sólo
dicen que el algoritmo hace lo que dice cuando la entrada es limpia — que es el
paso previo, no la respuesta.

### De qué tipo son los errores

En los 4 casos de 60 en que el correcto quedó fuera del grupo, **tres son una
variante contra su línea base**: 203c perdió con 203, 117c con 117. Para el
usuario eso es casi acertar —«vas en la 203»—; para el ETA no, porque la
variante toma otro camino más adelante.

El empate, en cambio, casi siempre es entre recorridos que **comparten el
corredor completo** que se grabó. Ahí no hay nada que afinar: la información no
está en el GPS. Dos recorridos que van por la misma calle, parando en los mismos
paraderos, producen la misma traza.

---

## 3. Qué significa para el producto

**Un empate declarado es información; un empate escondido es un ETA
equivocado.** Por eso el sistema devuelve el grupo completo en vez de elegir el
primero.

De aquí salen tres consecuencias concretas:

1. **La decisión D11 de `06` queda resuelta a favor de la confirmación.** Con
   50% de casos concluyentes, la telemetría totalmente automática no alcanza
   sola. Un toque del usuario —«¿vas en la 506 o en la 507?»— convierte el 93%
   en certeza, y sólo hace falta en la mitad de los viajes.
2. **El auto se descarta, no se marca con poca confianza.** Recorrer el trazado
   sin detenerse en los paraderos es un descarte duro: si entrara como «dato de
   baja calidad», la telemetría acabaría llena de autos, que son mucho más
   rápidos que los buses y arruinarían el ETA en la dirección peor.
3. **Bajo tierra la respuesta correcta es no responder.** En Metro el GPS se
   corta; el sistema detecta el corte y no empareja nada, en lugar de inventar
   un recorrido de superficie que pase por arriba.

---

## 4. Tres defectos que encontró la simulación

Vale anotarlos porque ninguno se ve leyendo el código, y los tres habrían
aparecido igual con trazas reales — sólo que más tarde y peor.

**El ruido del GPS inflaba los viajes al triple.** Con un punto por segundo, la
distancia entre dos muestras de una micro son unos 6 m y el error del GPS otros
10: el cociente mide ruido, no velocidad. Un viaje de 3,47 km se medía como
9,78 km, y la velocidad media pasaba de 22 a 61 km/h. Una micro quedaba
clasificada como un auto en la autopista y una caminata como una micro. Se
arregla midiendo sobre una ventana de 20 segundos y remuestreando por tiempo
antes de sumar.

**La señal de paradas medía otra cosa.** Ver arriba: velocidad baja cerca de un
paradero es simplemente pasar por al lado.

**El simulador no se detenía en ningún paradero**, y nadie lo habría notado
porque la señal equivocada igual daba 7 de 9. Un paradero que coincidía con el
punto de partida se quedaba para siempre a la cabeza de la cola y bloqueaba
todos los demás.

---

## 5. Cómo se usa

```sh
cd backend

# analizar las trazas grabadas
python -m trazas.cli analizar ../datos-terreno/*.gpx --detalle

# ver los tres casos de prueba sobre un recorrido concreto
python -m trazas.cli simular --recorrido 506 --detalle

# volver a medir el acierto sobre toda la red
python -m trazas.cli medir --muestra 60
```

| Archivo | Qué hace |
|---|---|
| `gpx.py` | Lee los `.gpx` que exportan Geo Tracker, OpenTracks y similares |
| `segmentar.py` | Parte la traza en caminando / a bordo / detenido |
| `emparejar.py` | Las tres señales y el fallo, con su margen |
| `simular.py` | Trazas sintéticas: micro, auto por la misma calle, y Metro |
| `cli.py` | Las tres órdenes de arriba |

---

## 6. Lo que sigue sin saberse

- [ ] **Cómo se comporta con trazas reales.** Es la única pregunta que importa
      y sólo la contestan los `.gpx` de `10-prueba-de-terreno.md`.
- [ ] Si la detención en paradero sobrevive a una micro que para en medio de
      una cuadra por un taco, que es lo normal en hora punta.
- [ ] Si el corte del GPS en Metro es tan limpio como se supone, o deja puntos
      erráticos en el andén antes de perderse.
