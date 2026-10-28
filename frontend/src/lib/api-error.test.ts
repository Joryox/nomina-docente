import { describe, expect, it } from "vitest";

import { getErrorMessage } from "./api-error";

const conflict = {
  subject_name: "Bases de Datos",
  career_code: "ISC",
  group: "3101",
  weekday: 3,
  start_time: "08:00",
  end_time: "10:00",
};

describe("mensajes de error con datos", () => {
  it("un empalme dice qué día y con qué clase choca", () => {
    const message = getErrorMessage("SCHEDULE_OVERLAP", {
      weekday: 3,
      start_time: "07:00",
      end_time: "09:00",
      all_or_nothing: true,
      conflicts: [conflict],
    });

    expect(message).toBe(
      "El miércoles, 07:00–09:00 se empalma con Bases de Datos · ISC · Grupo 3101 (08:00–10:00). No se guardó ningún horario. Elige otra hora de entrada o de salida para ese día.",
    );
  });

  it("dos rangos de la misma captura que se cruzan", () => {
    const message = getErrorMessage("SCHEDULE_RANGES_OVERLAP", {
      weekday: 2,
      ranges: [
        { start_time: "07:00", end_time: "09:00" },
        { start_time: "08:00", end_time: "10:00" },
      ],
    });

    expect(message).toContain("El martes, 07:00–09:00 y 08:00–10:00 se empalman.");
  });

  it("sin datos usa el texto general", () => {
    expect(getErrorMessage("SCHEDULE_OVERLAP")).toBe(
      "El horario se empalma con otra de tus clases. Elige otra hora.",
    );
  });
});
