import { describe, expect, it } from "vitest";

import {
  clockTimeToMinutes,
  formatClockTime,
  maskTimeTyping,
  parseTimeInput,
  snapToStep,
  stepTime,
  timeOptions,
} from "./time-input";

describe("maskTimeTyping", () => {
  it.each([
    ["", ""],
    ["1", "1"],
    ["14", "14:"],
    ["143", "14:3"],
    ["1430", "14:30"],
    ["14305", "14:30"],
    ["7", "07:"],
    ["7:", "07:"],
    ["1:3", "01:3"],
    ["25", "02:5"],
    ["0778", "07:07"],
    ["ab12cd", "12:"],
  ])("%j → %j", (raw, expected) => {
    expect(maskTimeTyping(raw)).toBe(expected);
  });

  it("no vuelve a poner los dos puntos al borrar", () => {
    expect(maskTimeTyping("14", true)).toBe("14");
  });
});

describe("parseTimeInput", () => {
  it.each([
    ["7", 7 * 60],
    ["07", 7 * 60],
    ["730", 7 * 60 + 30],
    ["0730", 7 * 60 + 30],
    ["7:5", 7 * 60 + 5],
    ["7:30", 7 * 60 + 30],
    ["7.30", 7 * 60 + 30],
    ["14:30", 14 * 60 + 30],
    ["1430", 14 * 60 + 30],
    ["23:59", 23 * 60 + 59],
    ["0:00", 0],
  ])("%j → %d minutos", (raw, minutes) => {
    expect(parseTimeInput(raw)).toBe(minutes);
  });

  it.each(["", "24:00", "12:60", "abc", "12345", "7:300"])("rechaza %j", (raw) => {
    expect(parseTimeInput(raw)).toBeNull();
  });
});

describe("formato y conversión", () => {
  it("formatea con dos dígitos", () => {
    expect(formatClockTime(7 * 60 + 5)).toBe("07:05");
    expect(formatClockTime(0)).toBe("00:00");
  });

  it("convierte HH:MM a minutos y rechaza horas imposibles", () => {
    expect(clockTimeToMinutes("09:15")).toBe(555);
    expect(clockTimeToMinutes("24:00")).toBeNull();
    expect(clockTimeToMinutes("9:15")).toBeNull();
  });
});

describe("intervalos", () => {
  const bounds = { min: 7 * 60, max: 22 * 60 };

  it("redondea al intervalo más cercano", () => {
    expect(snapToStep(7 * 60 + 58, 5)).toBe(8 * 60);
    expect(snapToStep(7 * 60 + 52, 5)).toBe(7 * 60 + 50);
    expect(snapToStep(23 * 60 + 58, 5)).toBe(23 * 60 + 55);
  });

  it("sube y baja alineando al intervalo y sin salir de los límites", () => {
    expect(stepTime(7 * 60 + 2, 1, 5, bounds)).toBe(7 * 60 + 5);
    expect(stepTime(7 * 60 + 7, -1, 5, bounds)).toBe(7 * 60 + 5);
    expect(stepTime(22 * 60, 1, 5, bounds)).toBe(22 * 60);
    expect(stepTime(7 * 60, -1, 5, bounds)).toBe(7 * 60);
  });

  it("genera las opciones de la lista", () => {
    const options = timeOptions(30, { min: 7 * 60 + 10, max: 9 * 60 });
    expect(options.map(formatClockTime)).toEqual(["07:30", "08:00", "08:30", "09:00"]);
  });
});
