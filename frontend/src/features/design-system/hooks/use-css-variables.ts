"use client";

import { useEffect, useState, type RefObject } from "react";

import { useResolvedTheme } from "@/lib/theme/preferences-store";

/**
 * Valores calculados de variables CSS en un elemento (o en <html>). La guía los lee del
 * navegador en lugar de repetirlos: lo que muestra es exactamente lo que usan los componentes.
 * Se recalcula al cambiar de tema.
 */
export function useCssVariables(
  names: readonly string[],
  scope?: RefObject<HTMLElement | null>,
): Readonly<Record<string, string>> {
  const theme = useResolvedTheme();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const element = scope?.current ?? document.documentElement;
    const style = getComputedStyle(element);
    // Lectura del DOM tras pintar: no hay otra fuente para los valores ya resueltos.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()])));
  }, [names, scope, theme]);

  return values;
}
