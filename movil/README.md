# App móvil — Bus Checker

React Native con Expo. **Un solo código para iPhone y Android.**

---

## Cómo verla en tu teléfono

No necesitas saber programar ni tener un Mac. Son tres pasos.

### 1. En tu teléfono: instala «Expo Go»

Búscala en la App Store o en Google Play. Es gratis.

### 2. En tu computador: instala Node

Descárgalo de [nodejs.org](https://nodejs.org) (la versión LTS) e instálalo como
cualquier programa.

### 3. Abre una terminal y escribe

```bash
git clone https://github.com/Tomato885-Dev/BusAPP
cd BusAPP/movil
npm install
npx expo start
```

Aparecerá un **código QR** en la pantalla. Escanéalo con la cámara del teléfono
(iPhone) o desde la app Expo Go (Android).

**La app se abre en tu teléfono.** Si editas el código, la app se actualiza sola.

> El computador y el teléfono tienen que estar en la misma red WiFi. Si no
> funciona, prueba `npx expo start --tunnel`.

---

## Verla en el navegador

La misma app corre en web, así que se publica en GitHub Pages y cualquiera del
equipo puede abrirla sin instalar nada:

**https://tomato885-dev.github.io/BusAPP/**

Sirve para **mostrar y revisar el diseño**. No reemplaza probarla en el teléfono:
en web no hay GPS en segundo plano, ni notificaciones, ni el comportamiento
nativo real.

Para compilarla localmente:

```bash
npx expo export --platform web --output-dir ../sitio
```

## Qué hay hasta ahora

| Pantalla | Estado |
|---|---|
| Mapa con paraderos | ✅ 3.748 paraderos reales en sus coordenadas |
| Llegadas del paradero | ✅ Recorridos reales, de menor a mayor tiempo |
| Cómo llegar (viajes) | ✅ Viajes directos sobre la red real |
| Favoritos | ⬜ Pendiente |
| Combinaciones con transbordo | ⬜ Necesita el servidor |
| Apple Watch | ⬜ Fase 5 |

**Qué es real y qué no:**

- **Reales:** paraderos, códigos, nombres, coordenadas, recorridos, secuencia de
  paradas y los viajes que calcula el planificador. Todo sale del feed del DTPM.
- **Simulados:** los tiempos de llegada. Para tenerlos de verdad hace falta el
  backend con el motor de `../docs/04-motor-de-estimacion.md`.

Los tiempos simulados reproducen los cuatro estados del motor —normal, sin
telemetría, fuentes que no coinciden, y micro que no va a llegar— así que
recorriendo el mapa se ven todos.

## Cuando el backend esté listo

Un solo cambio, en `src/api.ts`:

```ts
export const USAR_DATOS_SIMULADOS = false;
export const URL_BASE = "https://api.tudominio.cl/v1";
```

Las pantallas no se enteran: hablan con `src/api.ts`, no con la red.

## Estructura

```
app/                      Pantallas (el archivo define la ruta)
  _layout.tsx             Navegación
  index.tsx               Paraderos cercanos
  paradero/[id].tsx       Llegadas — la pantalla núcleo
src/
  tipos.ts                Contrato de la API (docs/03 §3.6)
  api.ts                  Datos: simulados hoy, backend mañana
  tema.ts                 Colores, claro y oscuro
  formato.ts              Cómo se muestran tiempos y estados
  componentes/            Piezas de interfaz
```

## Comandos

```bash
npx expo start        # ver la app en el teléfono
npm run typecheck     # revisar que no haya errores de tipos
```
