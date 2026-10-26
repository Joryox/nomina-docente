/**
 * Catálogo de los tokens semánticos: qué existe, para qué sirve y qué pares de color deben
 * cumplir contraste. Los VALORES están en tokens.css; aquí solo los nombres. Lo usan la
 * prueba de contraste (tokens.test.ts) y la guía viva (/sistema-diseno).
 */

export const SEMANTIC_COLOR_GROUPS = [
  {
    id: "surfaces",
    tokens: ["canvas", "surface", "surface-raised", "surface-sunken", "surface-hover", "overlay"],
  },
  { id: "lines", tokens: ["line", "line-strong"] },
  { id: "text", tokens: ["fg", "fg-muted", "fg-disabled"] },
  {
    id: "primary",
    tokens: [
      "primary",
      "primary-hover",
      "primary-pressed",
      "on-primary",
      "primary-soft",
      "primary-soft-hover",
      "primary-ink",
      "focus",
    ],
  },
  {
    id: "success",
    tokens: ["success", "on-success", "success-soft", "success-ink", "success-line"],
  },
  {
    id: "warning",
    tokens: ["warning", "on-warning", "warning-soft", "warning-ink", "warning-line"],
  },
  {
    id: "danger",
    tokens: ["danger", "danger-hover", "on-danger", "danger-soft", "danger-ink", "danger-line"],
  },
  { id: "info", tokens: ["info", "on-info", "info-soft", "info-ink", "info-line"] },
] as const;

export type SemanticColorGroup = (typeof SEMANTIC_COLOR_GROUPS)[number]["id"];
export type SemanticColor = (typeof SEMANTIC_COLOR_GROUPS)[number]["tokens"][number];

export const SEMANTIC_COLORS: readonly SemanticColor[] = SEMANTIC_COLOR_GROUPS.flatMap(
  (group) => group.tokens,
);

export type ContrastKind = "text" | "nonText";

export interface ContrastPair {
  foreground: SemanticColor;
  background: SemanticColor;
  kind: ContrastKind;
}

const text = (foreground: SemanticColor, ...backgrounds: SemanticColor[]): ContrastPair[] =>
  backgrounds.map((background) => ({ foreground, background, kind: "text" }));

const nonText = (foreground: SemanticColor, ...backgrounds: SemanticColor[]): ContrastPair[] =>
  backgrounds.map((background) => ({ foreground, background, kind: "nonText" }));

const SURFACES: SemanticColor[] = [
  "canvas",
  "surface",
  "surface-raised",
  "surface-sunken",
  "surface-hover",
];

/**
 * Pares que la interfaz usa de verdad. Texto normal: 4.5:1 (WCAG 1.4.3). Bordes de campos,
 * indicador de foco e iconos con significado: 3:1 (WCAG 1.4.11). Los iconos y bordes de
 * estado (campo con error, aviso) usan los tonos `*-ink`; los sólidos son fondos de botón.
 * `fg-disabled` no está: el texto deshabilitado está exento en WCAG y se distingue además
 * por el cursor y el fondo.
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  ...text("fg", ...SURFACES, "primary-soft"),
  ...text("fg-muted", ...SURFACES),
  ...text("on-primary", "primary", "primary-hover", "primary-pressed"),
  ...text(
    "primary-ink",
    "canvas",
    "surface",
    "surface-raised",
    "primary-soft",
    "primary-soft-hover",
  ),
  ...text("on-success", "success"),
  ...text("success-ink", "success-soft", "surface", "canvas"),
  ...text("on-warning", "warning"),
  ...text("warning-ink", "warning-soft", "surface", "canvas"),
  ...text("on-danger", "danger", "danger-hover"),
  ...text("danger-ink", "danger-soft", "surface", "surface-raised", "canvas"),
  ...text("on-info", "info"),
  ...text("info-ink", "info-soft", "surface", "canvas"),
  ...nonText("line-strong", "canvas", "surface", "surface-raised"),
  ...nonText("focus", "canvas", "surface", "surface-raised"),
  ...nonText("primary", "canvas", "surface"),
  ...nonText("danger-ink", "surface", "surface-raised"),
  ...nonText("success-ink", "surface"),
];
