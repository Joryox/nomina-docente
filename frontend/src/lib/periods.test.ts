import { describe, expect, it } from "vitest";

import { parsePeriodKey, periodKey, periodOf, recentPeriods } from "./periods";

describe("quincenas", () => {
  it("ubica una fecha en su quincena (días 15 y 16)", () => {
    expect(periodOf("2026-10-15")).toEqual({ year: 2026, month: 10, fortnight: 1 });
    expect(periodOf("2026-10-16")).toEqual({ year: 2026, month: 10, fortnight: 2 });
    expect(periodOf("2028-02-29")).toEqual({ year: 2028, month: 2, fortnight: 2 });
  });

  it("lista las quincenas recientes cruzando meses y años", () => {
    expect(recentPeriods("2027-01-10", 4)).toEqual([
      { year: 2027, month: 1, fortnight: 1 },
      { year: 2026, month: 12, fortnight: 2 },
      { year: 2026, month: 12, fortnight: 1 },
      { year: 2026, month: 11, fortnight: 2 },
    ]);
  });

  it("convierte la quincena en clave de selector y de regreso", () => {
    const period = { year: 2026, month: 10, fortnight: 2 } as const;
    expect(parsePeriodKey(periodKey(period))).toEqual(period);
    expect(parsePeriodKey("2026-10-3")).toBeUndefined();
  });
});
