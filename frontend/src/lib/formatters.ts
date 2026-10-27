import { CURRENCY, LOCALE, TIMEZONE } from "@/constants/locale";
import { TEXTS } from "@/constants/texts";

import type { Fortnight, Weekday } from "./api-types";

/**
 * Formatos del sistema (docs/sistema-de-diseno.md §8). Dinero y horas llegan de la API como cadenas
 * decimales ("1250.00") y se formatean **sin convertirlas a número**: `Intl.NumberFormat`
 * acepta la cadena y la trata como decimal exacto, así que nunca se pierde un centavo.
 */

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type DecimalString = `${number}`;

function asDecimal(value: string): DecimalString {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new RangeError(`No es una cadena decimal: ${value}`);
  }
  return value as DecimalString;
}

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIMEZONE,
});

const moneyFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });

const hoursFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Las fechas de calendario ("2026-10-15") no tienen zona: se formatean en UTC para que el
// día nunca se recorra por la diferencia horaria del navegador.
const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const ISO_SUNDAY = 7;

// Fecha de calendario de una marca de tiempo en la zona del sistema ("en-CA" da AAAA-MM-DD).
const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat(LOCALE, { month: "long", timeZone: "UTC" });

function calendarDate(iso: string): Date {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) {
    throw new RangeError(`No es una fecha ISO: ${iso}`);
  }
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/** Hora en formato de 24 horas con dos dígitos, en la zona horaria del sistema (`14:30`). */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/** `$1,250.00 MXN` a partir de `"1250.00"`. */
export function formatMoney(amount: string): string {
  return `${moneyFormatter.format(asDecimal(amount))} ${CURRENCY}`;
}

/** `12.50 h` a partir de `"12.50"`. */
export function formatHours(hours: string): string {
  return `${hoursFormatter.format(asDecimal(hours))} ${TEXTS.calendar.hoursSuffix}`;
}

/** `15 de octubre de 2026` a partir de `"2026-10-15"`. */
export function formatLongDate(isoDate: string): string {
  return longDateFormatter.format(calendarDate(isoDate));
}

/** `lunes 26 de octubre de 2026` a partir de `"2026-10-26"`. */
export function formatFullDate(isoDate: string): string {
  const date = calendarDate(isoDate);
  // getUTCDay: 0 = domingo; ISO 8601: 7 = domingo.
  const weekday = (date.getUTCDay() || ISO_SUNDAY) as Weekday;
  return `${formatWeekday(weekday)} ${longDateFormatter.format(date)}`;
}

/** `vie 23 de octubre` a partir de `"2026-10-23"`: para listas dentro de una quincena. */
export function formatDayOfPeriod(isoDate: string): string {
  const date = calendarDate(isoDate);
  const weekday = (date.getUTCDay() || ISO_SUNDAY) as Weekday;
  return `${formatWeekdayShort(weekday)} ${date.getUTCDate()} de ${monthFormatter.format(date)}`;
}

/** `26 de octubre de 2026, 10:32` a partir de una marca de tiempo ISO, en la zona del sistema. */
export function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return `${longDateFormatter.format(calendarDate(isoDateFormatter.format(date)))}, ${formatTime(date)}`;
}

export function formatWeekday(weekday: Weekday): string {
  return TEXTS.calendar.weekdays[weekday];
}

export function formatWeekdayShort(weekday: Weekday): string {
  return TEXTS.calendar.weekdaysShort[weekday];
}

/** `07:00–09:00`. */
export function formatTimeRange(start: string, end: string): string {
  return `${start}–${end}`;
}

function monthName(year: number, month: number): string {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

interface PeriodLike {
  year: number;
  month: number;
  fortnight: Fortnight;
}

/** `2.ª quincena de octubre de 2026`. */
export function formatPeriodName({ year, month, fortnight }: PeriodLike): string {
  return `${TEXTS.calendar.fortnights[fortnight]} de ${monthName(year, month)} de ${year}`;
}

/** `2.ª quincena de octubre de 2026 (16 al 31 de octubre)`. */
export function formatPeriod(period: PeriodLike & { start_date: string; end_date: string }) {
  const start = calendarDate(period.start_date).getUTCDate();
  const end = calendarDate(period.end_date).getUTCDate();
  const month = monthName(period.year, period.month);
  return `${formatPeriodName(period)} (${start} al ${end} de ${month})`;
}
