import { TIMEZONE } from "@/constants/locale";
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

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Fecha ISO a `Date` local a medianoche (para el calendario visual; sin corrimiento de día). */
export function isoToLocalDate(isoDate: string): Date | undefined {
  const match = ISO_DATE.exec(isoDate);
  if (!match) {
    return undefined;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** `Date` local a fecha ISO, con los componentes locales (no UTC). */
export function localDateToIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en la zona horaria de la institución (America/Mexico_City), como ISO. */
export function todayIso(now: Date = new Date()): string {
  return isoDateFormatter.format(now);
}

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour: "numeric",
  hourCycle: "h23",
});

/** Hora del día (0 a 23) en la zona horaria de la institución. */
export function currentHour(now: Date = new Date()): number {
  return Number(hourFormatter.format(now));
}
