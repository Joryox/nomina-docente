/**
 * Lector mínimo de las variables CSS de los archivos de tokens, para las pruebas. Solo
 * entiende lo que esos archivos usan: bloques `selector { --nombre: valor; }` en el nivel
 * superior. Las reglas `@media` se omiten (ajustan espaciado y movimiento, no colores).
 */

export type TokenMap = ReadonlyMap<string, string>;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripAtRules(css: string): string {
  let result = "";
  let index = 0;
  while (index < css.length) {
    const at = css.indexOf("@media", index);
    if (at === -1) {
      result += css.slice(index);
      break;
    }
    result += css.slice(index, at);
    let depth = 0;
    let cursor = css.indexOf("{", at);
    for (; cursor < css.length; cursor += 1) {
      if (css[cursor] === "{") depth += 1;
      if (css[cursor] === "}") depth -= 1;
      if (depth === 0) break;
    }
    index = cursor + 1;
  }
  return result;
}

export interface CssBlock {
  selectors: string[];
  declarations: Map<string, string>;
}

export function parseCssBlocks(css: string): CssBlock[] {
  const source = stripAtRules(stripComments(css));
  const blocks: CssBlock[] = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selectorText = "", body = ""] = match;
    const declarations = new Map<string, string>();
    for (const declaration of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      const [, name = "", value = ""] = declaration;
      declarations.set(name, value.replace(/\s+/g, " ").trim());
    }
    blocks.push({ selectors: selectorText.split(",").map((s) => s.trim()), declarations });
  }
  return blocks;
}

/** Variables vigentes en un modo: las de `:root` más las del bloque del tema. */
export function tokensForTheme(blocks: CssBlock[], theme: "light" | "dark"): TokenMap {
  const tokens = new Map<string, string>();
  const themeSelector = `[data-theme="${theme}"]`;
  for (const block of blocks) {
    if (block.selectors.includes(":root")) {
      block.declarations.forEach((value, name) => tokens.set(name, value));
    }
  }
  for (const block of blocks) {
    if (block.selectors.includes(themeSelector)) {
      block.declarations.forEach((value, name) => tokens.set(name, value));
    }
  }
  return tokens;
}

/** Resuelve `var(--x)` (encadenadas) hasta llegar a un valor literal. */
export function resolveToken(tokens: TokenMap, name: string, seen: string[] = []): string {
  const value = tokens.get(name);
  if (value === undefined) {
    throw new Error(`El token ${name} no está definido`);
  }
  if (seen.includes(name)) {
    throw new Error(`Referencia circular: ${[...seen, name].join(" → ")}`);
  }
  const reference = /^var\((--[\w-]+)\)$/.exec(value);
  return reference?.[1] ? resolveToken(tokens, reference[1], [...seen, name]) : value;
}
