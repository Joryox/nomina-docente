/**
 * Contraste de color según WCAG 2.2 a partir de colores `oklch()`, el formato de los tokens
 * (`src/styles/`). Lo usan la prueba automatizada de contraste y la guía viva del sistema
 * de diseño, así que ambas calculan exactamente lo mismo.
 */

export interface Oklch {
  lightness: number;
  chroma: number;
  hue: number;
  alpha: number;
}

/** Niveles mínimos de WCAG 2.2 AA. */
export const WCAG_AA = {
  /** Texto normal (1.4.3). */
  text: 4.5,
  /** Texto grande (≥ 24 px, o ≥ 18.66 px en negrita) (1.4.3). */
  largeText: 3,
  /** Bordes de controles, iconos con función e indicador de foco (1.4.11). */
  nonText: 3,
} as const;

const OKLCH_PATTERN =
  /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/;

/** Interpreta `oklch(L C H)` u `oklch(L C H / A)`; devuelve `null` si no es ese formato. */
export function parseOklch(value: string): Oklch | null {
  const match = OKLCH_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, l = "0", lPercent, c = "0", h = "0", a, aPercent] = match;
  const lightness = Number(l) / (lPercent ? 100 : 1);
  const alpha = a === undefined ? 1 : Number(a) / (aPercent ? 100 : 1);
  return { lightness, chroma: Number(c), hue: Number(h), alpha };
}

/** OKLCH → sRGB lineal (sin recortar), según la definición de Björn Ottosson. */
export function toLinearSrgb({ lightness, chroma, hue }: Oklch): [number, number, number] {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const GAMUT_TOLERANCE = 0.001;

/** `true` si el color cabe en sRGB: así el navegador no lo ajusta y el contraste es exacto. */
export function isInSrgbGamut(color: Oklch): boolean {
  return toLinearSrgb(color).every(
    (channel) => channel >= -GAMUT_TOLERANCE && channel <= 1 + GAMUT_TOLERANCE,
  );
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Luminancia relativa de WCAG (los canales lineales de sRGB ya están decodificados). */
export function relativeLuminance(color: Oklch): number {
  const [r, g, b] = toLinearSrgb(color).map(clamp) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste entre dos colores opacos (de 1 a 21). */
export function contrastRatio(foreground: Oklch, background: Oklch): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const [lighter, darker] = first > second ? [first, second] : [second, first];
  return (lighter + 0.05) / (darker + 0.05);
}

/** `4.52:1`, como se reporta el contraste. */
export function formatContrast(ratio: number): string {
  return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
}
