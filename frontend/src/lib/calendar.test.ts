import { describe, expect, it } from "vitest";

import { addDays, isoToLocalDate, localDateToIso, minutesBetween, todayIso } from "./calendar";

describe("calendario", () => {
  it("convierte entre fecha ISO y fecha local sin recorrer el día", () => {
    const date = isoToLocalDate("2026-10-31");
    expect(date?.getDate()).toBe(31);
    expect(localDateToIso(date!)).toBe("2026-10-31");
    expect(isoToLocalDate("31/10/2026")).toBeUndefined();
  });

  it("calcula hoy en la zona horaria de la institución", () => {
    // 2026-10-26 05:30 UTC sigue siendo 25 de octubre en la Ciudad de México (UTC-6).
    expect(todayIso(new Date(Date.UTC(2026, 9, 26, 5, 30)))).toBe("2026-10-25");
  });

  it("suma días cruzando meses y años bisiestos", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("calcula la duración de una clase", () => {
    expect(minutesBetween("07:00", "08:50")).toBe(110);
  });
});
