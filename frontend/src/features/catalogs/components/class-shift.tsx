"use client";

import { ShiftBadge } from "@/components/domain/shift-badge";

import { useShiftOf } from "../hooks/use-catalogs";

/** Turno (Matutino o Vespertino) de una clase según su hora de entrada; nada mientras carga. */
export function ClassShift({ startTime }: { startTime: string }) {
  const shift = useShiftOf()(startTime);
  return shift ? <ShiftBadge shift={shift} /> : null;
}
