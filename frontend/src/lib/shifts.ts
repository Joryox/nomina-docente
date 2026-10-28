import { clockTimeToMinutes } from "./time-input";

export type Shift = "morning" | "afternoon";

/**
 * Turno de una clase según su hora de entrada (RN-43): desde `afternoonStart` (publicado por
 * el servidor en GET /catalogs/business-rules) es vespertina; antes, matutina. Nunca lo
 * captura el docente.
 */
export function shiftOf(startTime: string, afternoonStart: string): Shift {
  const start = clockTimeToMinutes(startTime);
  const threshold = clockTimeToMinutes(afternoonStart);
  return start !== null && threshold !== null && start >= threshold ? "afternoon" : "morning";
}
