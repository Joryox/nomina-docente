import { describe, expect, it } from "vitest";

import { needsSetup } from "./setup-progress";

const empty = { subject_count: 0, active_assignment_count: 0, schedule_count: 0, session_count: 0 };

describe("guía de configuración", () => {
  it("aparece mientras falte una materia, una asignación o un horario", () => {
    expect(needsSetup(empty)).toBe(true);
    expect(needsSetup({ ...empty, subject_count: 2, active_assignment_count: 1 })).toBe(true);
  });

  it("desaparece al tener lo necesario para registrar clases", () => {
    expect(
      needsSetup({
        subject_count: 1,
        active_assignment_count: 1,
        schedule_count: 1,
        session_count: 0,
      }),
    ).toBe(false);
  });

  it("quien ya tiene bitácora ve el panel aunque haya desactivado todo", () => {
    expect(needsSetup({ ...empty, session_count: 30 })).toBe(false);
  });
});
