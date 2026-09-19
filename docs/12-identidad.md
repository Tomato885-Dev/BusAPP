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

El conjunto va **centrado ópticamente**, no matemáticamente: la composición se
corrió 22 px a la izquierda porque el punto de la derecha tira el peso visual
hacia ese lado.

### Piezas

| Archivo | Para qué |
|---|---|
| `icon.png` | iOS y la tienda. Degradado vertical de `#2d827d` a `#1c5754` |
| `android-icon-foreground.png` | Android recorta el ícono con formas distintas según el teléfono; el símbolo va al 62% para caber en cualquiera |
| `android-icon-background.png` | El teal plano de la marca |
| `android-icon-monochrome.png` | Para el tema dinámico de Android |
| `splash-icon.png` | Símbolo en blanco, sobre el teal profundo |
| `favicon.png` | La versión web |

Se generan desde un SVG con `/tmp/marca/icono.mjs` renderizado en Chromium: no
hay ningún PNG dibujado a mano que después nadie pueda volver a producir.

---

## La tipografía: Manrope

Elegida por dos razones concretas.

**Sus números.** Esta app se lee de reojo, en la calle, con el teléfono en
movimiento. Casi todo lo que importa es un número: «4 min», «0–12 min», «5
paradas». Manrope tiene cifras abiertas y bien separadas, que no se confunden a
tamaño chico.

**Su forma.** Es geométrica sin ser fría. Ése es exactamente el registro de la
paleta: moderna, pero que no grite.

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
