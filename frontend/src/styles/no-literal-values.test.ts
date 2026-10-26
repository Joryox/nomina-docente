import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Verificación de «cero valores sueltos» (CLAUDE.md §4.4 y §7.2): fuera de los archivos de
 * tokens no puede haber colores literales, valores arbitrarios de Tailwind con medidas o
 * colores, ni utilidades de las escalas por defecto que globals.css elimina (Tailwind las
 * ignoraría en silencio y el componente se vería sin estilo).
 */

const SRC = fileURLToPath(new URL("..", import.meta.url));

/** Únicos archivos donde viven valores de color: los tokens y el lector de oklch(). */
const ALLOWED = new Set(["styles/tokens.css", "styles/brand.css", "lib/color-contrast.ts"]);

const RULES: { name: string; pattern: RegExp }[] = [
  { name: "color hexadecimal", pattern: /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i },
  {
    name: "función de color",
    pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix)\(/i,
  },
  {
    name: "valor arbitrario de Tailwind con medida o color",
    pattern:
      /(?<![\w&])[a-z][\w-]*-\[[^\]\s]*(?:\d(?:px|rem|em|%|vh|vw|dvh|svh|ch|ms|s)\b|#|rgb|hsl|oklch)[^\]\s]*\]/,
  },
  {
    name: "color de la paleta por defecto de Tailwind",
    pattern:
      /\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|decoration|placeholder|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?\b/,
  },
  {
    name: "tamaño de texto por defecto de Tailwind (usa la escala semántica)",
    pattern: /(?<![\w-])text-(?:xs|sm|base|lg|[2-9]?xl)\b/,
  },
  {
    name: "sombra, radio o desenfoque fuera de la escala",
    pattern: /(?<![\w-])(?:shadow-(?:lg|xl|2xl)|rounded-(?:xl|[2-4]xl)|backdrop-blur(?:-\w+)?)\b/,
  },
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(tsx?|css)$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

const files = sourceFiles(SRC)
  .map((path) => relative(SRC, path).split(sep).join("/"))
  .filter((path) => !ALLOWED.has(path));

describe("sin valores literales fuera de los tokens", () => {
  it("revisa los archivos de src/", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files)("%s", (file) => {
    const lines = readFileSync(join(SRC, file), "utf8").split("\n");
    const violations = lines.flatMap((line, index) =>
      RULES.filter((rule) => rule.pattern.test(line)).map(
        (rule) => `línea ${index + 1}: ${rule.name} → ${line.trim()}`,
      ),
    );
    expect(violations).toEqual([]);
  });
});
