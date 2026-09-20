/* ---------------------------------------------------------------------------
   Genera todas las piezas de la marca a partir de `geometria.mjs`.

       node marca/marca.mjs

   Produce:
     · los PNG de ícono, splash y favicon en `movil/assets/`
     · `movil/src/componentes/geometriaMarca.ts`, que es el mismo dibujo en
       TypeScript para que la app lo pinte en pantalla
     · `marca/muestrario.png`, una hoja para mirar el conjunto de una vez

   Que el archivo de la app sea **generado** y no escrito a mano es el punto:
   es lo único que garantiza que el símbolo del ícono y el símbolo de la
   pantalla de carga sean literalmente el mismo dibujo.
--------------------------------------------------------------------------- */

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

import {
  ANGULOS,
  CAJA,
  CENTRO_OPTICO,
  CONTENIDO,
  LOGOTIPO,
  PUNTO,
  TRAZO,
  svgMarca,
  svgMarcaAjustada,
} from "./geometria.mjs";

/**
 * Chromium, venga de donde venga.
 *
 * Playwright puede estar instalado en el proyecto, global, o en ninguna parte.
 * Se prueban las tres y se falla con una instrucción, no con un volcado.
 */
function abrirChromium() {
  // `require` —a diferencia de `import`— respeta NODE_PATH, que es como se
  // alcanza una instalación global de Playwright sin agregar dependencias al
  // proyecto móvil sólo para dibujar íconos.
  const pedir = createRequire(import.meta.url);
  for (const paquete of ["playwright-core", "playwright"]) {
    try {
      // Sin `executablePath`: que Playwright use el Chromium que tenga
      // instalado. Fijar una ruta lo ataba a una máquina en particular.
      return pedir(paquete).chromium.launch(
        process.env.CHROME ? { executablePath: process.env.CHROME } : {},
      );
    } catch (e) {
      if (e?.code !== "MODULE_NOT_FOUND") throw e;
    }
  }
  throw new Error(
    "Falta Playwright. Instálalo con:  npm i -g playwright\n" +
      "y córrelo con:  NODE_PATH=$(npm root -g) node marca/marca.mjs",
  );
}

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "..");
const assets = path.join(raiz, "movil", "assets");

/** Teal de marca (`tema.ts` → `marca`). */
const TEAL = "#256d6a";
/** El extremo profundo del degradado; es también el fondo del splash. */
const TEAL_HONDO = "#1c5754";

/**
 * Cuánto ocupa el símbolo dentro del lienzo del ícono.
 *
 * iOS no recorta, así que el margen es puramente de composición: al 76% el
 * dibujo ocupa poco más de la mitad del ancho, que es la proporción con la que
 * un ícono se ve apoyado y no apretado contra el borde.
 *
 * Android sí recorta, y con formas distintas según el teléfono: ahí el
 * contenido tiene que caber en el 66% central, y por eso baja a 0,62.
 */
const ESCALA_IOS = 0.76;
const ESCALA_ANDROID = 0.62;

const piezas = [
  {
    archivo: "icon.png",
    tam: 1024,
    svg: svgMarca({ fondo: "url(#g)", tinta: "#ffffff", escala: ESCALA_IOS }),
  },
  {
    archivo: "android-icon-foreground.png",
    tam: 1024,
    svg: svgMarca({ tinta: "#ffffff", escala: ESCALA_ANDROID }),
  },
  {
    archivo: "android-icon-background.png",
    tam: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CAJA} ${CAJA}" width="1024" height="1024"><rect width="${CAJA}" height="${CAJA}" fill="${TEAL}"/></svg>`,
  },
  {
    archivo: "android-icon-monochrome.png",
    tam: 1024,
    svg: svgMarca({ tinta: "#ffffff", escala: ESCALA_ANDROID }),
  },
  {
    archivo: "splash-icon.png",
    tam: 512,
    svg: svgMarca({ tinta: "#ffffff", escala: ESCALA_IOS }),
  },
  {
    archivo: "favicon.png",
    tam: 64,
    svg: svgMarca({ fondo: "url(#g)", tinta: "#ffffff", escala: ESCALA_IOS }),
  },
];

/* --- 1. El archivo de geometría que consume la app --------------------- */

const ts = `/**
 * El símbolo de Kupay, en números.
 *
 * ⚠️ **Archivo generado. No editarlo a mano.**
 * Sale de \`marca/geometria.mjs\` al correr \`node marca/marca.mjs\`.
 *
 * Existe para que el símbolo que la app dibuja y el que llevan los íconos de
 * las tiendas sean el mismo dibujo, y no dos que se parecen.
 */

/** Todo está definido en una caja de ${CAJA} × ${CAJA}. */
export const CAJA = ${CAJA};

/** Grosor del trazo, igual en los dos ángulos. */
export const TRAZO = ${TRAZO};

/** Los dos ángulos. El primero es el de atrás: más chico y más tenue. */
export const ANGULOS = ${JSON.stringify(ANGULOS, null, 2).replace(/"([a-z]+)":/g, "$1:")} as const;

/** El punto de destino. */
export const PUNTO = ${JSON.stringify(PUNTO).replace(/"([a-z]+)":/g, "$1:")} as const;

/** Centro óptico del conjunto: dos unidades a la izquierda del geométrico. */
export const CENTRO_OPTICO = ${JSON.stringify(CENTRO_OPTICO).replace(/"([a-z]+)":/g, "$1:")} as const;

/** La caja del dibujo, para componer el logotipo sin vacíos sobrantes. */
export const CONTENIDO = ${JSON.stringify(CONTENIDO).replace(/"([a-z]+)":/g, "$1:")} as const;

/** Proporciones del logotipo, relativas al cuerpo de la letra. */
export const LOGOTIPO = ${JSON.stringify(LOGOTIPO).replace(/"([a-z]+)":/g, "$1:")} as const;
`;

const destinoTs = path.join(
  raiz,
  "movil",
  "src",
  "componentes",
  "geometriaMarca.ts",
);
fs.writeFileSync(destinoTs, ts);
console.log("escrito", path.relative(raiz, destinoTs));

/* --- 2. Los PNG -------------------------------------------------------- */

const navegador = await abrirChromium();

async function aPng(svg, tam, destino, fondo = "transparent") {
  const pagina = await navegador.newPage({
    viewport: { width: tam, height: tam },
    deviceScaleFactor: 1,
  });
  await pagina.setContent(
    `<body style="margin:0;background:${fondo}">
       <div style="width:${tam}px;height:${tam}px">${svg.replace(
         /width="\d+" height="\d+"/,
         `width="${tam}" height="${tam}"`,
       )}</div>
     </body>`,
  );
  await pagina.waitForTimeout(120);
  await pagina.screenshot({ path: destino, omitBackground: fondo === "transparent" });
  await pagina.close();
}

for (const p of piezas) {
  const destino = path.join(assets, p.archivo);
  await aPng(p.svg, p.tam, destino);
  console.log(
    p.archivo.padEnd(30),
    `${p.tam}px`.padStart(7),
    `${fs.statSync(destino).size} bytes`,
  );
}

/* --- 3. El muestrario -------------------------------------------------- */

/**
 * Una hoja con todo junto: el ícono, el símbolo a los tamaños en que de verdad
 * se usa, y el logotipo. Sirve para lo único que importa acá, que es mirarlo:
 * los defectos de una marca no se detectan leyendo coordenadas.
 */
const fuente = fs.readFileSync(
  path.join(
    raiz,
    "movil/node_modules/@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf",
  ),
).toString("base64");

const tamanosReales = [180, 120, 80, 60, 40, 29];

/** El logotipo compuesto: símbolo recortado + palabra, en proporción exacta. */
function lockup(cuerpo, tintaSimbolo, tintaPalabra) {
  return `<div class="lockup" style="--gap:${(cuerpo * LOGOTIPO.espacio).toFixed(1)}px;--fs:${cuerpo}px">
    ${svgMarcaAjustada({ tinta: tintaSimbolo, alto: cuerpo * LOGOTIPO.alto })}
    <span class="palabra" style="color:${tintaPalabra}">kupay</span>
  </div>`;
}

const muestrario = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @font-face { font-family: Manrope; src: url(data:font/ttf;base64,${fuente}); font-weight: 800; }
  body { margin:0; background:#f3f5f4; font-family: Manrope, sans-serif;
         color:#182220; padding:56px; width:1100px; box-sizing:border-box; }
  h1 { font-size:13px; letter-spacing:1.4px; text-transform:uppercase;
       color:#8a9794; margin:0 0 20px; }
  section { margin-bottom:52px; }
  .fila { display:flex; align-items:flex-end; gap:34px; }
  .pie { font-size:11px; color:#8a9794; margin-top:10px; letter-spacing:.4px; }
  .lockup { display:flex; align-items:center; gap:var(--gap); }
  .palabra { font-size:var(--fs); font-weight:800; letter-spacing:-0.035em; line-height:1; }
  .lockup svg { display:block; }
  .oscuro { background:#0f1413; color:#e7ecea; padding:34px; border-radius:26px; }
  .chip { background:#fff; border-radius:26px; padding:26px; display:inline-block; }
</style></head><body>

<section>
  <h1>El ícono</h1>
  <div class="fila">
    ${tamanosReales
      .map(
        (t) => `<div><div style="width:${t}px;height:${t}px;border-radius:${Math.round(
          t * 0.225,
        )}px;overflow:hidden">${svgMarca({
          fondo: "url(#g)",
          tinta: "#ffffff",
          escala: ESCALA_IOS,
          tam: t,
        })}</div><div class="pie">${t} px</div></div>`,
      )
      .join("")}
  </div>
  <div class="pie" style="margin-top:16px">A 29 px todavía se distinguen los dos ángulos y el punto. Ésa es la prueba.</div>
</section>

<section>
  <h1>El logotipo</h1>
  <div class="fila" style="align-items:center">
    ${[52, 32, 20].map((f) => lockup(f, TEAL, TEAL_HONDO)).join("")}
  </div>
  <div class="pie">Manrope ExtraBold, interletrado −3,5%. El símbolo abarca del ascendente de la «k» al descendente de la «y»: así su trazo pesa lo mismo que el asta de las letras.</div>
</section>

<section>
  <h1>Sobre fondo oscuro y sobre color</h1>
  <div class="fila" style="align-items:center">
    <div class="oscuro">${lockup(38, "#69bdb6", "#e7ecea")}</div>
    <div class="oscuro" style="background:${TEAL_HONDO}">${lockup(38, "#ffffff", "#ffffff")}</div>
    <div class="chip">${lockup(38, TEAL, TEAL_HONDO)}</div>
  </div>
</section>

<section>
  <h1>El símbolo solo</h1>
  <div class="fila" style="align-items:center">
    ${[96, 64, 44, 28, 20, 14]
      .map(
        (t) =>
          `<div><div style="height:96px;display:flex;align-items:flex-end">${svgMarca(
            { tinta: TEAL, escala: 1, tam: t },
          )}</div><div class="pie">${t}</div></div>`,
      )
      .join("")}
  </div>
</section>

</body></html>`;

const pagina = await navegador.newPage({ viewport: { width: 1100, height: 900 } });
await pagina.setContent(muestrario);
await pagina.waitForTimeout(250);
await pagina.screenshot({ path: path.join(aqui, "muestrario.png"), fullPage: true });
await pagina.close();
console.log("muestrario.png");

await navegador.close();
