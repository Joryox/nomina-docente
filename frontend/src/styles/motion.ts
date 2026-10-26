/**
 * Tokens de movimiento para Framer Motion (etapa 9), que necesita números y no variables
 * CSS. Son los mismos valores que `--duration-*` y `--easing-*` de tokens.css; la prueba
 * motion.test.ts falla si se desalinean. Con `prefers-reduced-motion`, los componentes usan
 * `useReducedMotion()` de Framer Motion y transiciones de opacidad o instantáneas.
 */

/** Segundos. */
export const DURATIONS = {
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
  emphasis: 0.4,
} as const;

/** Curvas cúbicas de Bézier. */
export const EASINGS = {
  standard: [0.2, 0, 0, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
