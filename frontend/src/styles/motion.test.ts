import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DURATIONS, EASINGS } from "./motion";
import { parseCssBlocks, tokensForTheme } from "./parse-css-tokens";

const css = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8");
const tokens = tokensForTheme(parseCssBlocks(css), "light");

describe("tokens de movimiento", () => {
  it.each(Object.entries(DURATIONS))("--duration-%s coincide con motion.ts", (name, seconds) => {
    expect(tokens.get(`--duration-${name}`)).toBe(`${Math.round(seconds * 1000)}ms`);
  });

  it.each(Object.entries(EASINGS))("--easing-%s coincide con motion.ts", (name, curve) => {
    expect(tokens.get(`--easing-${name}`)).toBe(`cubic-bezier(${curve.join(", ")})`);
  });

  it("se anulan con prefers-reduced-motion", () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1];
    for (const name of Object.keys(DURATIONS)) {
      expect(reduced).toContain(`--duration-${name}: 0ms;`);
    }
  });
});
