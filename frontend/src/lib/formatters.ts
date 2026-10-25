import { LOCALE, TIMEZONE } from "@/constants/locale";

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIMEZONE,
});

/** Hora en formato de 24 horas con dos dígitos, en la zona horaria del sistema (`14:30`). */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}
