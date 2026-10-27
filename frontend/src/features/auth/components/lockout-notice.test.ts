import { describe, expect, it } from "vitest";

import { remainingText } from "./lockout-notice";

describe("tiempo restante del bloqueo", () => {
  it("redondea hacia arriba a minutos completos", () => {
    expect(remainingText(900)).toBe("15 minutos");
    expect(remainingText(61)).toBe("2 minutos");
    expect(remainingText(60)).toBe("1 minuto");
  });

  it("el último minuto se dice en palabras", () => {
    expect(remainingText(59)).toBe("menos de un minuto");
  });
});
