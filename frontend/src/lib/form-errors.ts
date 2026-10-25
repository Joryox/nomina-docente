import { z } from "zod";

import { ApiError } from "./api-error";

const validationDetailsSchema = z.object({
  fields: z.array(
    z.object({
      location: z.array(z.string()),
      message: z.string(),
    }),
  ),
});

/**
 * Asigna a cada campo del formulario el mensaje de validación que devolvió el backend
 * (`VALIDATION_ERROR`, `details.fields[].location = ["body", "<campo>"]`). Devuelve los
 * campos que recibieron un error.
 */
export function applyServerFieldErrors<TField extends string>(
  error: unknown,
  fields: readonly TField[],
  setFieldError: (field: TField, message: string) => void,
): TField[] {
  if (!(error instanceof ApiError)) {
    return [];
  }
  const parsed = validationDetailsSchema.safeParse(error.details);
  if (!parsed.success) {
    return [];
  }
  const applied: TField[] = [];
  for (const issue of parsed.data.fields) {
    const field = fields.find((candidate) => candidate === issue.location.at(-1));
    if (field && !applied.includes(field)) {
      setFieldError(field, issue.message);
      applied.push(field);
    }
  }
  return applied;
}
