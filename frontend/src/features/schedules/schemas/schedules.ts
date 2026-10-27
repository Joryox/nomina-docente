import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/error-messages";
import { CLOCK_TIME_PATTERN } from "@/constants/validation";
import {
  assignmentSummarySchema,
  clockTimeSchema,
  decimalStringSchema,
  weekdaySchema,
} from "@/lib/api-schemas";
import type { ApiSchemas } from "@/lib/api-types";
import { checkClassTimes, type ClassDurationRules } from "@/lib/class-times";

export const weeklyScheduleSchema = z.object({
  days: z.array(
    z.object({
      weekday: weekdaySchema,
      classes: z.array(
        z.object({
          schedule_id: z.uuid(),
          assignment: assignmentSummarySchema,
          start_time: clockTimeSchema,
          end_time: clockTimeSchema,
          duration_minutes: z.number().int(),
        }),
      ),
      total_minutes: z.number().int(),
    }),
  ),
  total_minutes: z.number().int(),
  total_hours: decimalStringSchema,
}) satisfies z.ZodType<ApiSchemas["WeeklyScheduleResponse"]>;

const clockTime = z.string().regex(CLOCK_TIME_PATTERN, VALIDATION_MESSAGES.clockTime);

/**
 * Horario semanal con los límites que publica el servidor. Los empalmes con otras clases
 * los detecta el servidor (SCHEDULE_OVERLAP), que conoce todas las clases del docente.
 */
export function scheduleFormSchema(rules: ClassDurationRules) {
  return z
    .object({
      weekday: z.coerce.number().pipe(weekdaySchema),
      start_time: clockTime,
      end_time: clockTime,
    })
    .superRefine((value, ctx) => checkClassTimes(value, rules, ctx)) satisfies z.ZodType<
    ApiSchemas["ScheduleCreate"]
  >;
}

/** Horario nuevo con la asignación elegida de un selector (el diálogo de alta). */
export function newScheduleFormSchema(rules: ClassDurationRules) {
  return z
    .object({
      assignment_id: z.uuid(VALIDATION_MESSAGES.selectOption),
      weekday: z.coerce.number(VALIDATION_MESSAGES.selectOption).pipe(weekdaySchema),
      start_time: clockTime,
      end_time: clockTime,
    })
    .superRefine((value, ctx) => checkClassTimes(value, rules, ctx));
}
