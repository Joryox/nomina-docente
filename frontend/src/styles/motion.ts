/**
 * Tokens de movimiento para Framer Motion, que necesita números y no variables
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

/** Desplazamientos y escalas de las entradas: apenas perceptibles, nunca protagonistas. */
export const MOTION_DISTANCE = {
  /** Píxeles que sube una página al entrar. */
  page: 6,
  /** Píxeles que sube cada pieza de una lista escalonada. */
  item: 8,
  /** Escala inicial de un elemento que aparece como respuesta a una acción. */
  popScale: 0.92,
} as const;

/** Separación entre piezas de una lista escalonada (segundos). */
export const STAGGER_SECONDS = 0.04;

/** Duración del cambio de una cifra (segundos): la de los paneles. */
export const FIGURE_TWEEN_SECONDS = DURATIONS.slow;
