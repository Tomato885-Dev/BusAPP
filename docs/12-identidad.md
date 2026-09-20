# 12 — Identidad visual de Kupay

## El símbolo

Dos ángulos que avanzan hacia un punto.

El punto es el paradero. Los ángulos son lo que se acerca. El de atrás va más
tenue, que es como se dibuja el movimiento sin recurrir a líneas de velocidad.

No hay ninguna micro en el ícono, y es a propósito. Kupay no vende buses, vende
la respuesta a una pregunta: **¿viene?** El símbolo dice eso y nada más.

### Se diseñó para 29 px, no para 1024

Un ícono de aplicación se ve, casi siempre, del porte de una uña. Por eso hay
dos formas y no cinco, y por eso los trazos son gruesos: probado renderizado a
180, 120, 60, 40 y 29 px, y a 29 todavía se distinguen los dos ángulos y el
punto.

El conjunto va **centrado ópticamente**, no matemáticamente: el contenido está
dibujado con su centro en 48,05 de una caja de 100, dos unidades a la izquierda
del centro, porque el punto sólido de la derecha tira el peso visual hacia ese
lado.

### Un solo dibujo, no dos que se parecen

Éste era el defecto de fondo, y no se veía mirando una pieza a la vez.

El ícono de las tiendas salía de un SVG. El símbolo **dentro** de la app estaba
hecho aparte, con vistas rotadas. Eran dos dibujos distintos del mismo logotipo,
y se habían ido separando: distinto ángulo de abertura, distinto grosor de
trazo, y en el de la app los vértices **no se juntaban**, porque dos barras
giradas no forman una esquina —forman dos barras que se cruzan—.

Ahora hay un original y todo lo demás sale de ahí:

```
marca/geometria.mjs          ← el original: coordenadas, trazo, proporciones
        │
        ├── marca/marca.mjs  → movil/assets/*.png            (tiendas, splash)
        │                    → marca/muestrario.png          (para mirarlo)
        │                    → movil/src/componentes/geometriaMarca.ts
        │                                │
        └────────────────────────────────┴── Marca.tsx / Logotipo.tsx (la app)
```

`geometriaMarca.ts` es **generado**, y eso es el punto: no se puede editar sin
que el ícono cambie con él. Se rehace todo con:

```sh
node marca/marca.mjs
```

### Qué cambió del dibujo

| | Antes | Ahora |
|---|---|---|
| Abertura del ángulo | 90°, punta de flecha genérica | **80°**, apenas más filo: se lee como dirección |
| El ángulo de atrás | otra forma, de otras proporciones | **el mismo al 70%**: mismo carácter |
| Grosor | distinto en cada pieza | **único**, 9 de 100, en todo |
| Vértices | dos barras cruzadas | **una línea con remate redondo** |
| Centrado | a ojo, 22 px a la izquierda | **óptico y calculado**: el contenido va con su centro en 48,05 de 100 |

### Piezas

| Archivo | Para qué |
|---|---|
| `icon.png` | iOS y la tienda. Degradado vertical de `#2d827d` a `#1c5754`. El símbolo al 76% |
| `android-icon-foreground.png` | Android recorta el ícono con formas distintas según el teléfono; el símbolo va al 62% para caber en cualquiera |
| `android-icon-background.png` | El teal plano de la marca |
| `android-icon-monochrome.png` | Para el tema dinámico de Android |
| `splash-icon.png` | Símbolo en blanco, sobre el teal profundo |
| `favicon.png` | La versión web |

---

## El logotipo

El símbolo y la palabra juntos. Las proporciones son fijas y relativas al
cuerpo de la letra, así que el logotipo se ve igual a 20 px que a 200.

| | |
|---|---|
| **Alto del símbolo** | 0,93 del cuerpo — del ascendente de la «k» al descendente de la «y» |
| **Aire entre ambos** | 0,30 del cuerpo |
| **Interletrado** | −3,5% |

**El alto no es de composición, es de peso.** A 0,93 del cuerpo el trazo del
símbolo mide 6,7% del cuerpo, que es lo que mide el asta de Manrope ExtraBold.
Más chico, el símbolo se ve endeble al lado de la palabra: fue exactamente lo
que saltó al mirarlos juntos por primera vez, y la primera versión del logotipo
se descartó por eso.

**El aire es más de lo que pediría la regla**, y es por el punto: al ser redondo
y estar suelto, con menos espacio se lee como si fuera parte de la palabra.

**La palabra va en minúscula.** «Kupay» con mayúscula lo convierte en un nombre
propio de empresa; «kupay» sigue pareciendo una palabra que alguien dice, que es
de donde viene.

En la app el logotipo aparece **en un solo lugar**: la firma al pie de «Más».
En el mapa estorbaría, y el mapa es el producto.

---

## Las dos pantallas de arranque

Son dos, y ése era el problema.

1. La que el sistema operativo muestra **antes** de que exista React (un PNG).
2. La que React muestra mientras carga la tipografía (`Cargando.tsx`).

La segunda tenía el fondo claro de la app. Arrancar era entonces un parpadeo:
**teal → gris → app**, y ese parpadeo es la primera impresión del producto.

Ahora la segunda es una copia exacta de la primera —mismo fondo, mismo símbolo,
mismo tamaño calculado desde el PNG (180 px de ancho × 76% de trazo → 78 de
alto)— con una sola diferencia: **se mueve**. La transición deja de verse. El
símbolo simplemente empieza a avanzar.

No lleva texto, y no por gusto: la tipografía todavía no está cargada, así que
cualquier palabra saldría con la del sistema y después saltaría.

---

## La tipografía: Manrope

Elegida por dos razones concretas.

**Sus números.** Esta app se lee de reojo, en la calle, con el teléfono en
movimiento. Casi todo lo que importa es un número: «4 min», «0–12 min», «5
paradas». Manrope tiene cifras abiertas y bien separadas, que no se confunden a
tamaño chico.

**Su forma.** Es geométrica sin ser fría. Ése es exactamente el registro de la
paleta: moderna, pero que no grite.

### Lo que faltaba: interlineado y cifras de ancho fijo

Tener una tipografía elegida no es tenerla tipografiada. Faltaban dos cosas,
las dos invisibles hasta que se ven:

**Interlineado explícito en todos los niveles.** Sin él cada plataforma inventa
el suyo —iOS y Android no coinciden— y el mismo párrafo se ve distinto en cada
teléfono. Ahora los títulos van apretados (1,0 a 1,15), porque una línea suelta
en cuerpo grande se desarma, y el texto corrido va a 1,4.

**Cifras de ancho fijo en todo número que cambia solo.** Con cifras
proporcionales, pasar de «11 min» a «9 min» mueve el texto de lugar. En una
pantalla que se mira de reojo ese salto se nota más que el propio número. Va en
`tipo.gigante`, `tipo.dato` y `tipo.datoMenor`, que es donde viven las cuentas
regresivas.

También se cerró el interletrado a medida que crece el cuerpo: Manrope viene
espaciada para leer párrafos, y a 52 px ese mismo espaciado deja los números
flotando sueltos.

### Una regla técnica que no se puede romper

**Cada peso es un archivo distinto.** Con tipografías propias, `fontWeight` no
elige el archivo: hay que nombrarlo.

Poner `fontWeight: "700"` sobre una familia cargada produce una **negrita
falsa**, que el motor dibuja engordando los trazos y se ve sucia. Por eso en
toda la app se usa `fuente.*` de `src/tema.ts`, nunca `fontWeight`.

```ts
fuente.normal  // Manrope_500Medium
fuente.semi    // Manrope_600SemiBold
fuente.fuerte  // Manrope_700Bold
fuente.extra   // Manrope_800ExtraBold
```

Si la tipografía **no carga**, la app se dibuja igual con la del sistema. Una
app que no arranca por una fuente es peor que una app con otra fuente.

---

## Los íconos

Eran **caracteres de texto**: `≡`, `◷`, `★`, `⌕`, `⌖`, `▸`, `▤`. Funciona para
salir del paso y se nota, porque cada glifo viene de un tipógrafo distinto: otro
grosor, otro tamaño óptico, otro centrado. Una fila de íconos así no se ve
pareja nunca, y era lo que más hacía ver la interfaz vieja.

Ahora están dibujados, con **una sola regla**: el mismo grosor de trazo que el
símbolo de la marca. El logotipo usa 9 de 100; a 24 px eso da 2,16, y ése es el
grosor de todos. Un ícono de pestaña y el símbolo de la app pertenecen
visiblemente al mismo dibujo.

Todos comparten además caja de 24 × 24 con dos de margen, remates y uniones
redondos —como la marca—, y trazo sin relleno. La única excepción es la estrella
de favoritos, que se rellena cuando está activa.

Son dieciséis: `mapa`, `estrella`, `ruta`, `menu`, `buscar`, `ubicacion`, `mas`,
`menos`, `lineas`, `reloj`, `campana`, `salida`, `desvio`, `grafico`, `flecha`,
`cerrar`.

Dos se rehicieron después de verlos al tamaño real: **desvío** llevaba además un
signo de exclamación que a 20 px se leía como un borrón —el desvío ya es la
alerta—, y **líneas** tenía un conector vertical que lo confundía con el ícono
de menú, con el que convive en la misma barra.

---

## La paleta

Sigue siendo la de `src/tema.ts`, verificada en contraste WCAG AA. Lo que la
ordena:

**El color de marca es un teal apagado (`#256d6a`), no un azul corporativo.**
La app existe para que esperar una micro no dé ansiedad; el color tenía que
acompañar eso.

**No hay rojo de alarma.** El peor estado —«esta micro no viene»— usa una
terracota (`#a04c37`). Es una mala noticia, no una emergencia: un rojo de alerta
convierte cada consulta en un sobresalto, y el usuario termina odiando abrir la
app justo cuando más la necesita.

**El modo oscuro no es el claro invertido.** Tiene sus propios valores, con los
colores de estado aclarados para mantener el contraste sobre fondo oscuro.

---

## Lo que falta

- [ ] Ver el ícono instalado en un teléfono real, no sólo renderizado
- [ ] Decidir si el nombre se escribe en la tienda como «Kupay» o «Kupay — ¿viene
      o no viene?», que es lo que ayuda a encontrarlo en la búsqueda
- [ ] La pantalla de arranque de React sólo se ve en teléfono: en la versión web
      la tipografía no bloquea el primer dibujo, así que ahí nunca aparece. La
      coincidencia con la pantalla nativa está calculada, no fotografiada.
