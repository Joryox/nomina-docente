import type { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/error-messages";

import type { ApiSchemas } from "./api-types";
import { minutesBetween } from "./calendar";

export type ClassDurationRules = Pick<
  ApiSchemas["BusinessRulesResponse"],
  "class_min_duration_minutes" | "class_max_duration_minutes"
>;

/**
 * Misma regla que el backend para horarios y sesiones (RN-17 y duración configurada): la
 * salida es posterior a la entrada y la clase dura entre el mínimo y el máximo publicados.
 * El error se marca en el campo de salida.
 */
export function checkClassTimes(
  value: { start_time: string; end_time: string },
  rules: ClassDurationRules,
  ctx: z.RefinementCtx,
): void {
  const minutes = minutesBetween(value.start_time, value.end_time);
  let message: string | undefined;
  if (minutes <= 0) {
    message = VALIDATION_MESSAGES.endAfterStart;
  } else if (minutes < rules.class_min_duration_minutes) {
    message = VALIDATION_MESSAGES.classTooShort(rules.class_min_duration_minutes);
  } else if (minutes > rules.class_max_duration_minutes) {
    message = VALIDATION_MESSAGES.classTooLong(rules.class_max_duration_minutes);
  }
  if (message) {
    ctx.addIssue({ code: "custom", path: ["end_time"], message });
  }
}
