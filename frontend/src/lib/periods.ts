import { FIRST_FORTNIGHT_LAST_DAY } from "@/constants/locale";

import type { Fortnight } from "./api-types";

/** Quincena identificada como en la API (RN-24). */
export interface PeriodKey {
  year: number;
  month: number;
  fortnight: Fortnight;
}

const MONTHS_PER_YEAR = 12;

/** Quincena que contiene una fecha ISO ("2026-10-26" → 2.ª de octubre de 2026). */
export function periodOf(isoDate: string): PeriodKey {
  const [year = 0, month = 0, day = 0] = isoDate.split("-").map(Number);
  return { year, month, fortnight: day <= FIRST_FORTNIGHT_LAST_DAY ? 1 : 2 };
}

export function previousPeriod({ year, month, fortnight }: PeriodKey): PeriodKey {
  if (fortnight === 2) {
    return { year, month, fortnight: 1 };
  }
  return month === 1
    ? { year: year - 1, month: MONTHS_PER_YEAR, fortnight: 2 }
    : { year, month: month - 1, fortnight: 2 };
}

/** La quincena de `today` y las anteriores, de la más reciente a la más antigua. */
export function recentPeriods(today: string, count: number): PeriodKey[] {
  const periods = [periodOf(today)];
  while (periods.length < count) {
    const last = periods[periods.length - 1];
    if (!last) {
      break;
    }
    periods.push(previousPeriod(last));
  }
  return periods;
}

/** Clave estable para usar en selectores ("2026-10-2"). */
export function periodKey({ year, month, fortnight }: PeriodKey): string {
  return `${year}-${month}-${fortnight}`;
}

export function parsePeriodKey(key: string): PeriodKey | undefined {
  const [year, month, fortnight] = key.split("-").map(Number);
  if (!year || !month || (fortnight !== 1 && fortnight !== 2)) {
    return undefined;
  }
  return { year, month, fortnight };
}
