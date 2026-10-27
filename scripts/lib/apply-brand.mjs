// Aplica la identidad institucional en un solo paso (lo invoca scripts/apply-brand.sh).
//
//   node scripts/lib/apply-brand.mjs <carpeta-con-logos> <color-hex>
//
// 1. Copia logo.svg (obligatorio), logo-monochrome.svg y favicon.svg (opcionales) a
//    frontend/public/brand/ y el logo al PDF (backend/src/app/documents/brand/).
// 2. Declara los logos con sus medidas en frontend/src/config/brand-assets.json.
// 3. Genera la escala de 11 pasos de frontend/src/styles/brand.css a partir del color, en
//    OKLCH y dentro del gamut sRGB, con las mismas claridades que la escala actual.
// 4. Reemplaza el ícono de la pestaña y fija el color primario del PDF.
// Sin dependencias: solo Node.js.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FRONTEND = join(ROOT, "frontend");
const PUBLIC_BRAND = join(FRONTEND, "public", "brand");
const PDF_BRAND = join(ROOT, "backend", "src", "app", "documents", "brand");

// Claridad de cada paso (50 → 950) y fracción del croma máximo: la forma de la escala actual.
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const LIGHTNESS = [0.97, 0.94, 0.89, 0.82, 0.73, 0.63, 0.53, 0.45, 0.38, 0.31, 0.24];
const CHROMA_SHAPE = [0.09, 0.18, 0.35, 0.59, 0.82, 0.95, 1, 0.92, 0.8, 0.62, 0.45];
const PDF_STEP_INDEX = STEPS.indexOf(800);

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

// --- Color: hex → sRGB lineal → OKLab/OKLCH y de regreso -----------------------------------
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklch(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) fail(`El color debe ser hexadecimal de 6 dígitos, por ejemplo #8A1538 (recibí «${hex}»).`);
  const [r, g, b] = [0, 2, 4].map((i) => toLinear(parseInt(match[1].slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

function oklchToSrgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(fromLinear);
}

const inGamut = (rgb) => rgb.every((c) => c >= 0 && c <= 1);

/** Baja el croma hasta que el color quepa en sRGB (la prueba de tokens lo exige). */
function fitChroma(L, C, H) {
  let chroma = C;
  while (chroma > 0 && !inGamut(oklchToSrgb(L, chroma, H))) chroma -= 0.001;
  return Math.max(0, Number(chroma.toFixed(3)));
}

function brandScale(hex) {
  const { C, H } = hexToOklch(hex);
  const hue = Math.round(H);
  return STEPS.map((step, i) => ({
    step,
    L: LIGHTNESS[i],
    C: fitChroma(LIGHTNESS[i], C * CHROMA_SHAPE[i], hue),
    H: hue,
  }));
}

// --- Archivos -------------------------------------------------------------------------------
function svgSize(path) {
  const svg = readFileSync(path, "utf8");
  const viewBox = /viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/.exec(svg);
  if (viewBox) return { width: Math.round(Number(viewBox[1])), height: Math.round(Number(viewBox[2])) };
  const width = /\swidth="([\d.]+)/.exec(svg);
  const height = /\sheight="([\d.]+)/.exec(svg);
  if (width && height) return { width: Math.round(Number(width[1])), height: Math.round(Number(height[1])) };
  fail(`No pude leer el tamaño de ${path}: el SVG necesita viewBox o width y height.`);
}

const [sourceArg, colorArg] = process.argv.slice(2);
if (!sourceArg || !colorArg) {
  fail("Uso: bash scripts/apply-brand.sh <carpeta-con-logos> <color-hex>");
}
const source = resolve(sourceArg);
const logoPath = join(source, "logo.svg");
if (!existsSync(logoPath)) fail(`Falta ${logoPath}: el logo principal es obligatorio.`);

mkdirSync(PUBLIC_BRAND, { recursive: true });
mkdirSync(PDF_BRAND, { recursive: true });

const assets = { logo: null, logoOnDark: null };
copyFileSync(logoPath, join(PUBLIC_BRAND, "logo.svg"));
copyFileSync(logoPath, join(PDF_BRAND, "logo.svg"));
assets.logo = { src: "/brand/logo.svg", ...svgSize(logoPath) };
console.log("✓ Logo principal copiado (interfaz y PDF)");

const monochrome = join(source, "logo-monochrome.svg");
if (existsSync(monochrome)) {
  copyFileSync(monochrome, join(PUBLIC_BRAND, "logo-monochrome.svg"));
  assets.logoOnDark = { src: "/brand/logo-monochrome.svg", ...svgSize(monochrome) };
  console.log("✓ Logo para modo oscuro copiado");
}

const favicon = join(source, "favicon.svg");
if (existsSync(favicon)) {
  copyFileSync(favicon, join(PUBLIC_BRAND, "favicon.svg"));
  copyFileSync(favicon, join(FRONTEND, "src", "app", "icon.svg"));
  console.log("✓ Ícono de la pestaña reemplazado");
}

writeFileSync(
  join(FRONTEND, "src", "config", "brand-assets.json"),
  `${JSON.stringify(assets, null, 2)}\n`,
);
console.log("✓ Logos declarados en src/config/brand-assets.json");

const scale = brandScale(colorArg);
const lines = scale.map(({ step, L, C, H }) => `  --brand-${step}: oklch(${L} ${C} ${H});`);
writeFileSync(
  join(FRONTEND, "src", "styles", "brand.css"),
  `/*
 * Color de marca (primitivos). ÚNICO lugar donde vive el color institucional.
 *
 * Generado por scripts/apply-brand.sh a partir de ${colorArg.toUpperCase()}: misma forma de escala
 * (11 pasos, del más claro al más oscuro), tono y croma del color institucional, dentro del
 * gamut sRGB. \`npm test\` confirma que los pares de texto y fondo cumplen WCAG AA.
 */

:root {
${lines.join("\n")}
}
`,
);
console.log("✓ Escala de color generada en src/styles/brand.css");

const pdfStep = scale[PDF_STEP_INDEX];
const rgb = oklchToSrgb(pdfStep.L, pdfStep.C, pdfStep.H).map((c) => Math.round(c * 255));
writeFileSync(join(PDF_BRAND, "brand.json"), `${JSON.stringify({ primary_rgb: rgb }, null, 2)}\n`);
console.log("✓ Color primario del PDF actualizado");
