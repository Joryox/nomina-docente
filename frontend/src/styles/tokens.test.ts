import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  formatContrast,
  isInSrgbGamut,
  parseOklch,
  WCAG_AA,
} from "@/lib/color-contrast";

import { parseCssBlocks, resolveToken, tokensForTheme } from "./parse-css-tokens";
import { CONTRAST_PAIRS, SEMANTIC_COLORS } from "./token-catalog";

const read = (file: string) => readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8");

const blocks = parseCssBlocks(`${read("./brand.css")}\n${read("./tokens.css")}`);
const THEMES = ["light", "dark"] as const;
const themeTokens = Object.fromEntries(
  THEMES.map((theme) => [theme, tokensForTheme(blocks, theme)]),
) as Record<(typeof THEMES)[number], ReadonlyMap<string, string>>;

function color(theme: (typeof THEMES)[number], token: string) {
  const value = resolveToken(themeTokens[theme], `--${token}`);
  const parsed = parseOklch(value);
  if (!parsed) {
    throw new Error(`--${token} (${theme}) no es un color oklch(): ${value}`);
  }
  return parsed;
}

describe.each(THEMES)("tokens de color en modo %s", (theme) => {
  it("define todos los tokens semánticos del catálogo", () => {
    for (const token of SEMANTIC_COLORS) {
      expect(() => color(theme, token), `--${token}`).not.toThrow();
    }
  });

  it.each(CONTRAST_PAIRS.map((pair) => [`${pair.foreground} sobre ${pair.background}`, pair]))(
    "%s cumple WCAG AA",
    (_name, pair) => {
      const foreground = color(theme, pair.foreground);
      const background = color(theme, pair.background);
      expect(foreground.alpha, "el texto debe ser opaco").toBe(1);
      expect(background.alpha, "el fondo debe ser opaco").toBe(1);
      const ratio = contrastRatio(foreground, background);
      const minimum = pair.kind === "text" ? WCAG_AA.text : WCAG_AA.nonText;
      expect(ratio, `${formatContrast(ratio)} (mínimo ${minimum}:1)`).toBeGreaterThanOrEqual(
        minimum,
      );
    },
  );
});

describe("primitivos de color", () => {
  const primitives = [...themeTokens.light.entries()].filter(([, value]) =>
    value.startsWith("oklch("),
  );

  it("existen escalas completas", () => {
    expect(primitives.length).toBeGreaterThan(60);
  });

  it.each(primitives)("%s cabe en el gamut sRGB", (_name, value) => {
    const parsed = parseOklch(value);
    expect(parsed).not.toBeNull();
    expect(isInSrgbGamut(parsed!)).toBe(true);
  });

  it("los semánticos solo apuntan a primitivos (salvo las transparencias)", () => {
    for (const theme of THEMES) {
      for (const token of SEMANTIC_COLORS) {
        const raw = themeTokens[theme].get(`--${token}`) ?? "";
        const isAlpha = parseOklch(raw)?.alpha !== undefined && parseOklch(raw)!.alpha < 1;
        expect(raw.startsWith("var(--") || isAlpha, `--${token} (${theme}): ${raw}`).toBe(true);
      }
    }
  });
});

describe("mapeo a Tailwind (globals.css)", () => {
  const globals = read("./globals.css");

  it.each(SEMANTIC_COLORS)("expone --color-%s", (token) => {
    expect(globals).toContain(`--color-${token}: var(--${token});`);
  });

  it("borra las paletas por defecto de Tailwind", () => {
    for (const namespace of ["--color-*", "--text-*", "--shadow-*", "--radius-*", "--blur-*"]) {
      expect(globals).toContain(`${namespace}: initial;`);
    }
  });
});
