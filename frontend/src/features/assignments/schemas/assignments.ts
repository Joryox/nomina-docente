import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/error-messages";
import { FIELD_LIMITS, GROUP_CODE_PATTERN, MONEY_PATTERN } from "@/constants/validation";
import {
  careerSchema,
  decimalStringSchema,
  hourlyRateSchema,
  isoDateSchema,
  isoDateTimeSchema,
  pageSchema,
  scheduleSchema,
} from "@/lib/api-schemas";
import type { ApiSchemas } from "@/lib/api-types";

export const assignmentSchema = z.object({
  id: z.uuid(),
  subject: z.object({
    id: z.uuid(),
    name: z.string(),
    code: z.string().nullable(),
    is_active: z.boolean(),
  }),
  career: careerSchema,
  group: z.string().nullable(),
  hourly_rate: hourlyRateSchema,
  is_active: z.boolean(),
  active_until: isoDateSchema.nullable(),
  has_logbook: z.boolean(),
  schedules: z.array(scheduleSchema),
  weekly_minutes: z.number().int(),
  weekly_hours: decimalStringSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
}) satisfies z.ZodType<ApiSchemas["AssignmentResponse"]>;

export const assignmentPageSchema = pageSchema(assignmentSchema) satisfies z.ZodType<
  ApiSchemas["AssignmentPage"]
>;

/** Misma normalización que el backend (RN-41): «3101 a» → «3101-A»; vacío es sin grupo. */
export function normalizeGroup(value: string): string | null {
  return value.trim().split(/\s+/).filter(Boolean).join("-").toUpperCase() || null;
}

const groupSchema = z
  .string()
  .transform(normalizeGroup)
  .pipe(
    z
      .string()
      .max(FIELD_LIMITS.groupCode, VALIDATION_MESSAGES.maxLength(FIELD_LIMITS.groupCode))
      .regex(GROUP_CODE_PATTERN, VALIDATION_MESSAGES.groupCode)
      .nullable(),
  );

/**
 * Formulario de asignación: materia, carrera y tarifa se eligen de selectores alimentados
 * por la API (RN-06, RN-11); la tarifa viaja como cadena decimal, nunca como número. El
 * grupo es el único texto y es opcional.
 */
export const assignmentFormSchema = z.object({
  subject_id: z.uuid(VALIDATION_MESSAGES.selectOption),
  career_code: z.string().min(1, VALIDATION_MESSAGES.selectOption),
  hourly_rate: z.string().regex(MONEY_PATTERN, VALIDATION_MESSAGES.selectOption),
  group: groupSchema,
}) satisfies z.ZodType<ApiSchemas["AssignmentCreate"]>;
