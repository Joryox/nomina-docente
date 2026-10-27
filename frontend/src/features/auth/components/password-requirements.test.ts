import { describe, expect, it } from "vitest";

import type { PasswordPolicy } from "../types/auth";
import { isRuleMet } from "./password-requirements";

const policy: PasswordPolicy = {
  min_length: 12,
  max_length: 128,
  rules: ["min_length", "letter_required", "digit_required", "no_personal_data", "not_common"],
};

const context = (password: string, extra: Partial<Parameters<typeof isRuleMet>[1]> = {}) => ({
  policy,
  password,
  personalData: [],
  currentPassword: undefined,
  ...extra,
});

describe("requisitos de la contraseña en vivo", () => {
  it("revisa longitud, letra y número", () => {
    expect(isRuleMet("min_length", context("corta1"))).toBe(false);
    expect(isRuleMet("min_length", context("suficiente-12"))).toBe(true);
    expect(isRuleMet("letter_required", context("123456789012"))).toBe(false);
    expect(isRuleMet("digit_required", context("sin-numeros-aqui"))).toBe(false);
  });

  it("detecta nombre, apellidos o correo sin importar acentos ni mayúsculas", () => {
    const personalData = ["María José", "Núñez", "", "mjose.nunez@tesh.edu.mx"];
    expect(isRuleMet("no_personal_data", context("Nunez-Pizarron-26", { personalData }))).toBe(
      false,
    );
    expect(isRuleMet("no_personal_data", context("MARIA-pizarron-26", { personalData }))).toBe(
      false,
    );
    expect(isRuleMet("no_personal_data", context("Pizarron-Verde-26", { personalData }))).toBe(
      true,
    );
  });

  it("el dominio del correo y las partes cortas no cuentan como dato personal", () => {
    const personalData = ["Al", "Ruiz", "", "al@tesh.edu.mx"];
    expect(isRuleMet("no_personal_data", context("tesh-Pizarron-26", { personalData }))).toBe(true);
  });

  it("sin datos personales ni contraseña actual, esos requisitos los revisa el servidor", () => {
    expect(isRuleMet("no_personal_data", context("Pizarron-Verde-26"))).toBeNull();
    expect(isRuleMet("not_current", context("Pizarron-Verde-26"))).toBeNull();
    expect(isRuleMet("not_common", context("Password1234"))).toBeNull();
  });

  it("la nueva debe ser distinta de la actual", () => {
    const currentPassword = "Pizarron-Verde-26";
    expect(isRuleMet("not_current", context("Pizarron-Verde-26", { currentPassword }))).toBe(false);
    expect(isRuleMet("not_current", context("Cuaderno-Rojo-27", { currentPassword }))).toBe(true);
  });
});
