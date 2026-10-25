import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/error-messages";
import { FIELD_LIMITS, SUBJECT_CODE_PATTERN } from "@/constants/validation";
import { isoDateTimeSchema, pageSchema } from "@/lib/api-schemas";
import type { ApiSchemas } from "@/lib/api-types";

export const subjectSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  code: z.string().nullable(),
  is_active: z.boolean(),
  active_assignment_count: z.number().int(),
  assignment_count: z.number().int(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
}) satisfies z.ZodType<ApiSchemas["SubjectResponse"]>;

export const subjectPageSchema = pageSchema(subjectSchema) satisfies z.ZodType<
  ApiSchemas["SubjectPage"]
>;

export const subjectRemovalSchema = z.object({
  outcome: z.enum(["deleted", "deactivated"]),
  subject: subjectSchema.nullable(),
}) satisfies z.ZodType<ApiSchemas["SubjectRemovalResponse"]>;

const collapse = (value: string) => value.replace(/\s+/g, " ").trim();

/**
 * Formulario de materia. El servidor decide las mayúsculas y detecta duplicados sin
 * distinguir acentos (RN-09); aquí solo se evita enviar algo que seguro rechazará.
 */
export const subjectFormSchema = z.object({
  name: z
    .string()
    .transform(collapse)
    .pipe(
      z
        .string()
        .min(1, VALIDATION_MESSAGES.required)
        .max(FIELD_LIMITS.subjectName, VALIDATION_MESSAGES.maxLength(FIELD_LIMITS.subjectName)),
    ),
  code: z
    .string()
    .trim()
    .pipe(
      z.union([
        z.literal("").transform(() => null),
        z
          .string()
          .max(FIELD_LIMITS.subjectCode, VALIDATION_MESSAGES.maxLength(FIELD_LIMITS.subjectCode))
          .regex(SUBJECT_CODE_PATTERN, VALIDATION_MESSAGES.subjectCode),
      ]),
    ),
}) satisfies z.ZodType<ApiSchemas["SubjectCreate"]>;
