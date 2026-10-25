import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/error-messages";
import { CLOCK_TIME_PATTERN, FIELD_LIMITS } from "@/constants/validation";
import {
  assignmentSummarySchema,
  clockTimeSchema,
  decimalStringSchema,
  isoDateSchema,
  isoDateTimeSchema,
  pageSchema,
  periodSchema,
  scheduledClassSchema,
  warningSchema,
  weekdaySchema,
} from "@/lib/api-schemas";
import type { ApiSchemas } from "@/lib/api-types";
import { addDays } from "@/lib/calendar";
import { checkClassTimes, type ClassDurationRules } from "@/lib/class-times";

export const logbookEntrySchema = z.object({
  id: z.uuid(),
  assignment: assignmentSummarySchema,
  session_date: isoDateSchema,
  start_time: clockTimeSchema,
  end_time: clockTimeSchema,
  minutes: z.number().int(),
  hours: decimalStringSchema,
  hourly_rate: decimalStringSchema,
  notes: z.string().nullable(),
  period: z.object({
    year: z.number().int(),
    month: z.number().int(),
    fortnight: z.number().int(),
  }),
  is_locked: z.boolean(),
  matches_schedule: z.boolean(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
}) satisfies z.ZodType<ApiSchemas["LogbookEntryResponse"]>;

export const logbookEntryResultSchema = z.object({
  entry: logbookEntrySchema,
  warnings: z.array(warningSchema),
}) satisfies z.ZodType<ApiSchemas["LogbookEntryResult"]>;

export const logbookPageSchema = pageSchema(logbookEntrySchema).extend({
  totals: z.object({
    session_count: z.number().int(),
    total_minutes: z.number().int(),
    total_hours: decimalStringSchema,
  }),
}) satisfies z.ZodType<ApiSchemas["LogbookPage"]>;

export const scheduledClassesSchema = z.object({
  date: isoDateSchema,
  weekday: weekdaySchema,
  period: periodSchema,
  is_locked: z.boolean(),
  classes: z.array(scheduledClassSchema),
}) satisfies z.ZodType<ApiSchemas["ScheduledClassesResponse"]>;

export const quickLogbookResultSchema = z.object({
  results: z.array(logbookEntryResultSchema),
}) satisfies z.ZodType<ApiSchemas["QuickLogbookResponse"]>;

export type LogbookRules = ClassDurationRules &
  Pick<
    ApiSchemas["BusinessRulesResponse"],
    "today" | "logbook_max_age_days" | "quick_logbook_max_entries"
  >;

const clockTime = z.string().regex(CLOCK_TIME_PATTERN, VALIDATION_MESSAGES.clockTime);

const notes = z
  .string()
  .trim()
  .max(FIELD_LIMITS.logbookNotes, VALIDATION_MESSAGES.maxLength(FIELD_LIMITS.logbookNotes))
  .transform((value) => value || null);

/**
 * Fecha de sesión: no futura y dentro de la antigüedad máxima (RN-22). Las fechas ISO se
 * comparan como texto porque tienen el mismo formato y la misma longitud.
 */
function sessionDate(rules: LogbookRules) {
  const oldest = addDays(rules.today, -rules.logbook_max_age_days);
  return z.iso
    .date(VALIDATION_MESSAGES.date)
    .refine((value) => value <= rules.today, VALIDATION_MESSAGES.futureDate)
    .refine((value) => value >= oldest, VALIDATION_MESSAGES.dateTooOld(rules.logbook_max_age_days));
}

/**
 * Captura de una sesión: la asignación se elige de un selector y las horas se precargan
 * del horario (RN-20, RN-21). Las horas trabajadas y el importe los calcula el servidor.
 */
export function logbookEntryFormSchema(rules: LogbookRules) {
  return z
    .object({
      assignment_id: z.uuid(VALIDATION_MESSAGES.selectOption),
      session_date: sessionDate(rules),
      start_time: clockTime,
      end_time: clockTime,
      notes,
    })
    .superRefine((value, ctx) => checkClassTimes(value, rules, ctx)) satisfies z.ZodType<
    ApiSchemas["LogbookEntryCreate"]
  >;
}

/** Registro rápido de varias clases programadas de un día (todo o nada en el servidor). */
export function quickLogbookFormSchema(rules: LogbookRules) {
  return z.object({
    session_date: sessionDate(rules),
    entries: z
      .array(
        z
          .object({ schedule_id: z.uuid(), start_time: clockTime, end_time: clockTime, notes })
          .superRefine((value, ctx) => checkClassTimes(value, rules, ctx)),
      )
      .min(1, VALIDATION_MESSAGES.selectOption)
      .max(rules.quick_logbook_max_entries),
  }) satisfies z.ZodType<ApiSchemas["QuickLogbookRequest"]>;
}
