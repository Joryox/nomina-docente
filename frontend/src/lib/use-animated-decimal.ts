import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { FIGURE_TWEEN_SECONDS, EASINGS } from "@/styles/motion";

/**
 * Cifra decimal de la API ("1250.00") que, al cambiar, recorre los valores intermedios en
 * lugar de saltar. Solo es presentación: durante el recorrido se muestran aproximaciones con
 * los mismos decimales, y al terminar se muestra exactamente la cadena de la API (el cálculo
 * nunca pasa por `number`). La primera vez y con `prefers-reduced-motion`, no se anima.
 */
export function useAnimatedDecimal(value: string): string {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = Number(previous.current);
    const to = Number(value);
    previous.current = value;
    const decimals = value.split(".")[1]?.length ?? 0;
    if (reduced || from === to || !Number.isFinite(from) || !Number.isFinite(to)) {
      setDisplay(value);
      return;
    }
    const controls = animate(from, to, {
      duration: FIGURE_TWEEN_SECONDS,
      ease: EASINGS.standard,
      onUpdate: (latest) => setDisplay(latest.toFixed(decimals)),
      onComplete: () => setDisplay(value),
    });
    return () => controls.stop();
  }, [value, reduced]);

  return display;
}
