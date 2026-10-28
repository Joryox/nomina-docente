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
import { formatWeekday } from "@/lib/formatters";
import { clockTimeToMinutes } from "@/lib/time-input";

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

type BatchRules = ClassDurationRules &
  Pick<ApiSchemas["BusinessRulesResponse"], "schedule_batch_max_ranges">;

function overlaps(
  first: { start_time: string; end_time: string },
  second: { start_time: string; end_time: string },
): boolean {
  const [a, b, c, d] = [first.start_time, first.end_time, second.start_time, second.end_time].map(
    (value) => clockTimeToMinutes(value) ?? 0,
  ) as [number, number, number, number];
  return a < d && c < b;
}

/**
 * Captura de varios días (RN-42): cada rango de horas con los días en que se repite. Los
 * rangos de la misma captura no pueden cruzarse el mismo día; los empalmes con otras clases
 * los revisa el servidor, que guarda todo o nada.
 */
export function scheduleBatchFormSchema(rules: BatchRules) {
  const range = z
    .object({
      weekdays: z.array(weekdaySchema).min(1, VALIDATION_MESSAGES.weekdaysRequired),
      start_time: clockTime,
      end_time: clockTime,
    })
    .superRefine((value, ctx) => checkClassTimes(value, rules, ctx));
  return z
    .object({
      assignment_id: z.uuid(VALIDATION_MESSAGES.selectOption),
      ranges: z.array(range).min(1).max(rules.schedule_batch_max_ranges),
    })
    .superRefine(({ ranges }, ctx) => {
      ranges.forEach((current, index) => {
        for (const previous of ranges.slice(0, index)) {
          const shared = current.weekdays.find((day) => previous.weekdays.includes(day));
          if (shared !== undefined && overlaps(previous, current)) {
            ctx.addIssue({
              code: "custom",
              path: ["ranges", index, "weekdays"],
              message: VALIDATION_MESSAGES.rangesOverlap(formatWeekday(shared)),
            });
            return;
          }
        }
      });
    });
}
