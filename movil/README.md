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
| Paraderos cercanos | ✅ Funciona con datos de prueba |
| Llegadas del paradero | ✅ Funciona, con los 4 estados del motor |
| Mapa | ⬜ Pendiente |
| Favoritos | ⬜ Pendiente |
| Apple Watch | ⬜ Fase 5 |

**Los datos son inventados todavía.** Navega entre los distintos paraderos para
ver los cuatro escenarios del motor de estimación:

| Paradero | Qué muestra |
|---|---|
| **PA420** | Una micro que **no va a llegar**, con alternativa concreta |
| **PA433** | Todo normal, confianza alta |
| **PA415** | Las dos fuentes **no coinciden** |
| **PA425** | **Sin telemetría**: rangos anchos y la app lo admite |

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
