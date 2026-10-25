import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/error-messages";
import { MONEY_PATTERN } from "@/constants/validation";
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

/**
 * Formulario de asignación: los tres datos se eligen de selectores alimentados por la API
 * (RN-06, RN-11); la tarifa viaja como cadena decimal, nunca como número.
 */
export const assignmentFormSchema = z.object({
  subject_id: z.uuid(VALIDATION_MESSAGES.selectOption),
  career_code: z.string().min(1, VALIDATION_MESSAGES.selectOption),
  hourly_rate: z.string().regex(MONEY_PATTERN, VALIDATION_MESSAGES.selectOption),
}) satisfies z.ZodType<ApiSchemas["AssignmentCreate"]>;
