import { describe, expect, it } from "vitest";

import { shiftOf } from "./shifts";

describe("shiftOf", () => {
  it.each([
    ["07:00", "morning"],
    ["13:59", "morning"],
    ["14:00", "afternoon"],
    ["18:30", "afternoon"],
  ] as const)("una clase que empieza a las %s es %s con umbral 14:00", (start, shift) => {
    expect(shiftOf(start, "14:00")).toBe(shift);
  });

  it("sigue el umbral que publique el servidor", () => {
    expect(shiftOf("13:00", "12:30")).toBe("afternoon");
  });
});
