# Kupay

App de transporte público de Santiago. Las otras apps responden *cuándo*;
ésta responde ***si***: si la micro viene o no viene.

Todo —código, comentarios, documentación, mensajes de commit y la interfaz—
se escribe **en español**.

---

## Reglas duras

### 1. Kupay es un producto comercial

No es un proyecto comunitario, ni un experimento, ni software de hobby. Va a
cobrar, va a estar en las tiendas y va a tener usuarios que pagan. De eso se
siguen tres cosas que **no se negocian**:

- **Ninguna dependencia comunitaria, no oficial o por *scraping* en producción.**
  Nada de `api.xor.cl`, `red-api` ni envoltorios de `red.cl`. No se usan ni
  «mientras tanto»: lo provisorio se queda, y una app de pago que se cae porque
  un tercero rediseñó su sitio no es un producto.
- **Toda fuente de datos tiene que tener permiso de uso comercial por escrito.**
  Antes de construir encima de un dato, hay que poder mostrar de dónde sale y
  con qué licencia.
- **Cuando no hay dato, la app lo dice.** No se rellena con estimaciones
  presentadas como certezas. Hoy `MODO_DEMO` en `movil/src/api.ts` marca
  exactamente eso.

Las únicas dos fuentes válidas para «dónde está el bus» son el **acceso oficial
del DTPM** y la **telemetría propia** de usuarios a bordo. Ver `docs/01`.

### 2. La app se lee de reojo, en la calle, apurado

La pantalla principal responde la pregunta sin que haya que tocar nada. Toda
función nueva entra **subordinada** a eso, nunca compitiendo con eso.

### 3. Tipografía: nunca `fontWeight`

Manrope carga un archivo por peso. `fontWeight` sobre una familia propia
produce negrita falsa. Se usa siempre `fuente.*` de `movil/src/tema.ts`.
Ver `docs/12`.

---

## Dónde está cada cosa

| Carpeta | Qué hay |
|---|---|
| `movil/` | La app (Expo + expo-router). `src/tema.ts` es el sistema de diseño |
| `backend/gtfs/` | Ingesta del GTFS del DTPM → `movil/src/red.json` |
| `servidor/` | Esquema de Supabase (`esquema.sql`) y su verificador (`comprobar.sql`) |
| `marca/` | La fuente única de la marca: geometría, logotipo e íconos |
| `docs/` | Las decisiones y por qué se tomaron. `01` y `08` son los que más se usan |

## Comandos

```sh
cd movil && npm run typecheck     # tsc
cd backend && python -m pytest    # 40 pruebas
node marca/marca.mjs              # regenerar íconos y muestrario
```

`expo install` **no funciona** en este entorno (servicio bloqueado): usar
`npm install`.
