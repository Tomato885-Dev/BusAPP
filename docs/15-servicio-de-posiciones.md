# 15 — El servicio de posiciones del DTPM

**Llegó el 9 de octubre de 2026**, diecinueve días después de enviar la
solicitud. Es el dato que el proyecto llevaba meses esperando y el que cambia el
orden de todo lo demás.

| | |
|---|---|
| **Posicionamiento de flota** | `http://www.dtpmetropolitano.cl/posiciones` |
| **Alertas de flota** | `http://www.dtpmetropolitano.cl/alertas` |
| Acceso | Usuario y contraseña, entregados por correo |
| Documentación | Dos archivos adjuntos al correo, **todavía sin leer** |

---

## 1. Lo que esto cambia

Hasta ahora el producto tenía un problema de arranque serio: para saber si una
micro viene hacía falta telemetría de los usuarios, y la telemetría necesita
usuarios que todavía no existen. Sin datos nadie usa la app, y sin usuarios no
hay datos.

**Con las posiciones oficiales ese círculo se rompe.** La promesa central
—«¿viene o no viene?»— funciona desde el primer día y con un solo usuario,
porque la respuesta sale de mirar si hay un bus de ese recorrido en el tramo
anterior al paradero.

La telemetría propia no se cae del plan, pero **cambia de papel**: deja de ser
el cimiento y pasa a ser lo que explica *por qué* un bus no avanza —si va lleno,
si está detenido, si el dato oficial quedó viejo— y lo que cubre los huecos de
la fuente. El riesgo de densidad de usuarios (`06` R2) deja de estar en el
camino crítico.

---

## 2. Las credenciales

> **No están en este repositorio, y no pueden estarlo.** El repositorio es
> público.

Viven en **una sola parte**: las variables de entorno del servidor que consulta
el servicio. Ni en el código, ni en un archivo de configuración versionado, ni
—sobre todo— dentro de la aplicación móvil.

Lo último no es una precaución teórica. Cualquiera puede descomprimir el binario
de una app y leer las cadenas que lleva dentro; es de las primeras cosas que se
hacen al revisar una aplicación. Una credencial en la app es una credencial
pública, y el DTPM la entregó a nombre de una persona.

```
┌──────────┐   usuario/clave   ┌──────────────┐   sin credenciales   ┌─────┐
│   DTPM   │ ◄──────────────── │   Servidor   │ ◄─────────────────── │ App │
│ posiciones│ ──────────────►  │    Kupay     │  ──────────────────► │     │
└──────────┘   cada 30 s       └──────────────┘   datos ya digeridos └─────┘
```

Es la regla de `01` §1.5, y ahora tiene una razón concreta además de la
arquitectónica.

### Una cosa que hay que mirar: los portales son `http://`, no `https://`

Tal como vinieron en el correo, las dos direcciones son HTTP sin cifrar. Si la
autenticación es la básica de HTTP, **la contraseña viaja legible en cada
consulta**, en una cabecera que sólo está codificada en base64, no cifrada.

Qué hacer, en este orden:

1. **Probar primero `https://`.** Muchos servicios responden en ambos y la
   documentación quedó vieja.
2. Si sólo hay HTTP, asumirlo **sabiendo** lo que implica: que la credencial se
   expone en la red por la que viaje. Que todo salga de un único servidor
   nuestro —y no de miles de teléfonos en wifis públicas— reduce muchísimo la
   superficie, pero no la elimina.
3. **Preguntarlo al DTPM** en el mismo hilo del correo. Es una consulta
   razonable y no cuesta nada.

---

## 3. Lo que falta para consumirlo de verdad

### 3.1 Los dos documentos adjuntos 🧑

El correo traía **el documento que explica el formato** de los dos servicios y
un archivo llamado `serviciodeco`. Sin ellos no se puede escribir el adaptador:
no se sabe si la respuesta es XML o JSON, cómo se identifica cada vehículo, qué
campo trae el recorrido y el sentido, ni cada cuánto se actualiza.

**Es lo que bloquea hoy.** Todo lo demás del motor ya está escrito y probado
contra posiciones inventadas a mano.

### 3.2 Una IP fija 🧑

El formulario pedía registrar la IP pública desde donde se consume, y se
respondió «por definir». Ahora hay que definirla, y hace falta **dos veces**:

- Para pasar el servicio de posiciones a producción.
- Para pedir el **predictor de llegadas** (ver §4), donde es un requisito de
  entrada.

Lo que se necesita es un servidor chico con IP propia y estable. Del orden de
**USD 5 al mes**, que cabe de sobra en el presupuesto de `06`. No sirve una
conexión doméstica: la IP de la casa cambia.

### 3.3 El ritmo de consulta

Lo declarado en el formulario fue **una consulta cada 30 segundos desde un único
servidor**, unas 2.900 al día, independiente de cuántos usuarios tenga la app.
Ese número es un compromiso: hay que respetarlo, y si algún día hace falta más,
se pide antes de tomarlo.

---

## 4. Las tres respuestas a las consultas

### Sí existe un predictor de llegadas, y es otro trámite

Está en `red.cl/planifica-tu-viaje`. Para acceder hacen falta **IP fija** y un
**formulario que entrega Sonda**, y está *sujeto a disponibilidad de enlaces*,
porque son varias las empresas que lo consumen.

Que exista es buena noticia, pero **no es urgente**. Con las posiciones crudas
el ETA lo calcula Kupay (`04`), y eso tiene una ventaja que conviene no
regalar: el número es nuestro, podemos medir su error y corregirlo, y no estamos
obligados a repetir una cifra ajena aunque se vea mal. El predictor sirve
después, como segunda opinión para contrastar — que es justamente la estructura
de dos estimadores de `04` §4.4.

**Qué hacer:** pedirlo una vez que haya IP fija, no antes.

### El GTFS-Realtime está en los planes, «sujeto a prioridades presidenciales»

Traducido: puede ser el año que viene o no ser. **No se planifica nada contando
con eso.** Si aparece, simplifica el adaptador y nada más, porque la app ya usa
el estándar para el GTFS estático.

### La licencia: no hay cláusula que restrinja el uso

Es menos de lo que parece. «No hay una cláusula que lo restrinja» **no es lo
mismo que** «está autorizado el uso comercial». Es la ausencia de una
prohibición, no la presencia de un permiso.

Y la regla 1 de `CLAUDE.md` pide permiso de uso comercial **por escrito**.

El propio DTPM indicó el camino: una solicitud por Ley de Transparencia al
Ministerio de Transportes, en `portaltransparencia.cl`. Tiene plazo legal de 20
días hábiles y la respuesta es un documento oficial, que es exactamente lo que
hace falta para poder mostrársela a una tienda de aplicaciones o a quien compre
un estudio.

**No bloquea el desarrollo** —se puede construir mientras llega— pero sí
conviene tenerla antes de cobrarle a alguien.

---

## 5. Lo que ya está construido

El motor está escrito y probado, contra posiciones inventadas a mano, sin
depender del formato de la fuente (`backend/estimacion/`):

| Archivo | Qué hace |
|---|---|
| `flota.py` | Dónde va cada bus **a lo largo de su recorrido**, y a qué velocidad |
| `llegadas.py` | El ETA con su rango, y el veredicto: viene / no viene / sin datos |

Tres decisiones del motor que vale la pena conocer:

**El rango se muestra, el número no.** Decir «7 min» es prometer algo que el
dato no sostiene; «5–10 min» dice lo mismo sin mentir. La incertidumbre hoy es
un 35% deliberadamente generoso y **provisional**: `04` §4.6 dice que no se
supone sino que se mide, contrastando cada predicción con la llegada que
efectivamente ocurrió, y para eso hacen falta semanas de historia.

**«No viene» y «no sé» son respuestas distintas.** Si la fuente deja de
entregar posiciones, la respuesta es *sin datos*. Confundirlas haría que la app
anuncie «no viene ninguna» cada vez que se cae un servidor, que es la peor
manera posible de perder la confianza que el producto viene a construir.

**Un bus que ya pasó no es una llegada.** Con 60 m de tolerancia, porque un bus
detenido justo en el paradero está *en* el paradero, no lo dejó atrás.

---

## 6. Lo que sigue sin saberse

- [ ] El formato de los dos servicios *(bloqueado por los adjuntos)*
- [ ] Cada cuánto se actualizan realmente las posiciones
- [ ] Si la flota completa reporta, o sólo parte
- [ ] Si los identificadores de recorrido coinciden con los del GTFS estático
      —si no coinciden, hay que construir la equivalencia—
- [ ] Si responde por `https://`
