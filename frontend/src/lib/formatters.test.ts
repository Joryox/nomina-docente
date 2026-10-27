import { describe, expect, it } from "vitest";

import { formatDateTime, formatFullDate, formatMoney, formatPeriod } from "./formatters";

describe("formatos del sistema", () => {
  it("fecha completa con el día de la semana", () => {
    expect(formatFullDate("2026-10-26")).toBe("lunes 26 de octubre de 2026");
    expect(formatFullDate("2026-11-01")).toBe("domingo 1 de noviembre de 2026");
  });

  it("marca de tiempo en la zona de la institución y en 24 horas", () => {
    // 02:30 UTC del 27 son las 20:30 del 26 en la Ciudad de México (UTC-6).
    expect(formatDateTime("2026-10-27T02:30:00+00:00")).toBe("26 de octubre de 2026, 20:30");
  });

  it("dinero y quincenas", () => {
    expect(formatMoney("1250.00")).toBe("$1,250.00 MXN");
    expect(
      formatPeriod({
        year: 2026,
        month: 10,
        fortnight: 2,
        start_date: "2026-10-16",
        end_date: "2026-10-31",
      }),
    ).toBe("2.ª quincena de octubre de 2026 (16 al 31 de octubre)");
  });
});
