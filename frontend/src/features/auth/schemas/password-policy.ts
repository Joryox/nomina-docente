import { z } from "zod";

export const passwordRuleSchema = z.enum([
  "min_length",
  "max_length",
  "letter_required",
  "digit_required",
  "no_personal_data",
  "not_common",
  "not_current",
]);

/** Contrato de GET /auth/password-policy: la única fuente de los requisitos. */
export const passwordPolicySchema = z.object({
  min_length: z.number().int().positive(),
  max_length: z.number().int().positive(),
  rules: z.array(passwordRuleSchema),
});
