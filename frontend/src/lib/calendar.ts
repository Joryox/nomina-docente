import { MINUTES_PER_HOUR } from "@/constants/validation";

/**
 * Cálculos de calendario sobre fechas ISO ("2026-10-19") y horas "HH:MM", sin zona horaria:
 * representan el calendario y el reloj de la institución, igual que en el backend.
 */

/** Minutos del día de una hora "HH:MM". */
export function minutesOfDay(clockTime: string): number {
  const [hours = 0, minutes = 0] = clockTime.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

/** Duración de una clase en minutos (negativa si la salida es anterior a la entrada). */
export function minutesBetween(start: string, end: string): number {
  return minutesOfDay(end) - minutesOfDay(start);
}

/** Suma (o resta) días a una fecha ISO. */
export function addDays(isoDate: string, days: number): string {
  const [year = 0, month = 1, day = 1] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
