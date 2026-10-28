"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

import { DURATIONS, EASINGS, MOTION_DISTANCE, STAGGER_SECONDS } from "@/styles/motion";

/**
 * Movimiento del sistema: sutil y con propósito. Usa los tokens de `styles/motion.ts` y, con
 * `prefers-reduced-motion`, todo aparece al instante: el `MotionConfig` global quita los
 * desplazamientos y aquí las duraciones valen 0. El estado inicial es siempre el mismo (el
 * servidor no conoce la preferencia), así el HTML del servidor y el del cliente coinciden.
 */

/** Entrada de cada página: aparece y sube unos píxeles. */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: MOTION_DISTANCE.page }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : DURATIONS.slow, ease: EASINGS.enter }}
    >
      {children}
    </motion.div>
  );
}

function containerVariants(reduced: boolean): Variants {
  return {
    hidden: {},
    shown: { transition: { staggerChildren: reduced ? 0 : STAGGER_SECONDS } },
  };
}

function itemVariants(reduced: boolean): Variants {
  return {
    hidden: { opacity: 0, y: MOTION_DISTANCE.item },
    shown: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : DURATIONS.slow, ease: EASINGS.enter },
    },
  };
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Elemento contenedor: `ul` para listas, `div` para rejillas de tarjetas. */
  as?: "div" | "ul" | "section";
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/** Contenedor cuyas piezas (`StaggerItem`) entran una tras otra. */
export function Stagger({ children, className, as = "div", ...aria }: StaggerProps) {
  const reduced = useReducedMotion();
  const Component = motion[as];
  return (
    <Component
      className={className}
      variants={containerVariants(Boolean(reduced))}
      initial="hidden"
      animate="shown"
      {...aria}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const reduced = useReducedMotion();
  const Component = motion[as];
  return (
    <Component className={className} variants={itemVariants(Boolean(reduced))}>
      {children}
    </Component>
  );
}

/**
 * Retroalimentación de un cambio (clase registrada, dato guardado): el elemento nuevo entra
 * con un leve aumento. Se monta al cambiar de estado, así que solo se anima ese momento.
 */
export function Appear({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: MOTION_DISTANCE.popScale }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0 : DURATIONS.base, ease: EASINGS.enter }}
    >
      {children}
    </motion.span>
  );
}
