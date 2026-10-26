import { MINUTES_PER_HOUR } from "@/constants/validation";

/**
 * Lógica del selector de hora de 24 h (components/ui/time-input.tsx), separada para probarla.
 * Las horas viajan como "HH:MM", igual que en la API.
 */

const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;
const MAX_DIGITS = 4;

/** "HH:MM" a partir de minutos del día. */
export function formatClockTime(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/** Minutos del día de "HH:MM", o `null` si no es una hora válida. */
export function clockTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours >= HOURS_PER_DAY || minutes >= MINUTES_PER_HOUR) {
    return null;
  }
  return hours * MINUTES_PER_HOUR + minutes;
}

/**
 * Máscara mientras se escribe: solo dígitos y «:» automático, sin permitir horas imposibles.
 * Un dígito que no puede iniciar una hora o unos minutos de dos cifras recibe un cero
 * inicial ("7" → "07:", "25" → "02:5", "07:7" → "07:07"). Al borrar no se vuelve a poner
 * el «:» (`deleting`), para que la persona pueda corregir. Nunca produce más de "HH:MM".
 */
export function maskTimeTyping(raw: string, deleting = false): string {
  let digits = raw.replace(/\D/g, "");
  const typedSeparator = /^\d:/.test(raw);
  if (digits.length > 0 && (Number(digits[0]) > 2 || typedSeparator)) {
    digits = `0${digits}`;
  }
  if (digits[0] === "2" && Number(digits[1]) > 3) {
    digits = `0${digits}`;
  }
  if (digits.length >= 3 && Number(digits[2]) > 5) {
    digits = `${digits.slice(0, 2)}0${digits.slice(2)}`;
  }
  digits = digits.slice(0, MAX_DIGITS);
  if (digits.length <= 1 || (digits.length === 2 && deleting)) {
    return digits;
  }
  if (digits.length === 2) {
    return `${digits}:`;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * Interpreta lo escrito al salir del campo: "7" → 07:00, "730" → 07:30, "7:5" → 07:05,
 * "1430" → 14:30. Devuelve minutos del día o `null` si no es una hora posible.
 */
export function parseTimeInput(raw: string): number | null {
  const text = raw.trim();
  if (!text) {
    return null;
  }
  const separated = /^(\d{1,2})\s*[:.h]\s*(\d{0,2})$/.exec(text);
  let hours: number;
  let minutes: number;
  if (separated) {
    hours = Number(separated[1]);
    minutes = Number(separated[2] || "0");
  } else if (/^\d{1,4}$/.test(text)) {
    const padded = text.length <= 2 ? `${text.padStart(2, "0")}00` : text.padStart(MAX_DIGITS, "0");
    hours = Number(padded.slice(0, 2));
    minutes = Number(padded.slice(2));
  } else {
    return null;
  }
  if (hours >= HOURS_PER_DAY || minutes >= MINUTES_PER_HOUR) {
    return null;
  }
  return hours * MINUTES_PER_HOUR + minutes;
}

/** Redondea al intervalo más cercano ("07:58" con intervalo de 5 → "08:00"). */
export function snapToStep(minutes: number, step: number): number {
  return Math.min(Math.round(minutes / step) * step, MINUTES_PER_DAY - step);
}

/** Sube o baja un intervalo sin salir de los límites (flechas del teclado). */
export function stepTime(
  minutes: number,
  direction: 1 | -1,
  step: number,
  bounds: { min: number; max: number },
): number {
  const aligned =
    direction === 1
      ? Math.floor(minutes / step) * step + step
      : Math.ceil(minutes / step) * step - step;
  return Math.min(bounds.max, Math.max(bounds.min, aligned));
}

/** Opciones de la lista desplegable: cada intervalo entre los límites. */
export function timeOptions(step: number, bounds: { min: number; max: number }): number[] {
  const first = Math.ceil(bounds.min / step) * step;
  const options: number[] = [];
  for (let minutes = first; minutes <= bounds.max; minutes += step) {
    options.push(minutes);
  }
  return options;
}

export const DAY_BOUNDS = { min: 0, max: MINUTES_PER_DAY - 1 } as const;
