import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/error-messages";
import { TEXTS } from "@/constants/texts";
import {
  DIGIT_PATTERN,
  EMPLOYEE_NUMBER_PATTERN,
  FIELD_LIMITS,
  LETTER_PATTERN,
  PERSON_NAME_PATTERN,
} from "@/constants/validation";

import type { PasswordPolicy } from "../types/auth";

const rules = TEXTS.auth.passwordRequirements.rules;

const collapse = (value: string) => value.replace(/\s+/g, " ").trim();

const email = z
  .string()
  .trim()
  .min(1, VALIDATION_MESSAGES.required)
  .max(FIELD_LIMITS.email, VALIDATION_MESSAGES.maxLength(FIELD_LIMITS.email))
  .pipe(z.email(VALIDATION_MESSAGES.email));

const personName = z
  .string()
  .transform(collapse)
  .pipe(
    z
      .string()
      .min(1, VALIDATION_MESSAGES.required)
      .max(FIELD_LIMITS.personName, VALIDATION_MESSAGES.maxLength(FIELD_LIMITS.personName))
      .regex(PERSON_NAME_PATTERN, VALIDATION_MESSAGES.personName),
  );

const optionalPersonName = z
  .string()
  .transform(collapse)
  .pipe(
    z.union([
      z.literal(""),
      z
        .string()
        .max(FIELD_LIMITS.personName, VALIDATION_MESSAGES.maxLength(FIELD_LIMITS.personName))
        .regex(PERSON_NAME_PATTERN, VALIDATION_MESSAGES.personName),
    ]),
  );

const optionalEmployeeNumber = z
  .string()
  .trim()
  .pipe(
    z.union([
      z.literal(""),
      z
        .string()
        .max(
          FIELD_LIMITS.employeeNumber,
          VALIDATION_MESSAGES.maxLength(FIELD_LIMITS.employeeNumber),
        )
        .regex(EMPLOYEE_NUMBER_PATTERN, VALIDATION_MESSAGES.employeeNumber),
    ]),
  );

/**
 * Contraseña validada con los parámetros que publica el backend. Las reglas que dependen
 * de datos del servidor (contraseñas comunes) o de la persona las confirma el backend.
 */
export function passwordSchema(policy: PasswordPolicy) {
  return z
    .string()
    .min(policy.min_length, rules.min_length(policy.min_length))
    .max(policy.max_length, rules.max_length(policy.max_length))
    .regex(LETTER_PATTERN, rules.letter_required())
    .regex(DIGIT_PATTERN, rules.digit_required());
}

export const loginFormSchema = z.object({
  email,
  password: z.string().min(1, VALIDATION_MESSAGES.required),
});

/** Exige que la confirmación sea igual a la contraseña; el error va en la confirmación. */
function confirmationMatches(password: string, confirmation: string) {
  return (values: Readonly<Record<string, unknown>>, ctx: z.RefinementCtx) => {
    if (values[confirmation] && values[password] !== values[confirmation]) {
      ctx.addIssue({
        code: "custom",
        path: [confirmation],
        message: VALIDATION_MESSAGES.passwordMismatch,
      });
    }
  };
}

const profileFields = {
  first_names: personName,
  paternal_surname: personName,
  maternal_surname: optionalPersonName,
  employee_number: optionalEmployeeNumber,
};

export function registerFormSchema(policy: PasswordPolicy) {
  return z
    .object({
      ...profileFields,
      email,
      password: passwordSchema(policy),
      password_confirmation: z.string().min(1, VALIDATION_MESSAGES.required),
    })
    .superRefine(confirmationMatches("password", "password_confirmation"));
}

export const profileFormSchema = z.object(profileFields);

export function changePasswordFormSchema(policy: PasswordPolicy) {
  return z
    .object({
      current_password: z.string().min(1, VALIDATION_MESSAGES.required),
      new_password: passwordSchema(policy),
      new_password_confirmation: z.string().min(1, VALIDATION_MESSAGES.required),
    })
    .superRefine(confirmationMatches("new_password", "new_password_confirmation"));
}

export type LoginFormValues = z.input<typeof loginFormSchema>;
export type LoginPayload = z.output<typeof loginFormSchema>;
export type RegisterFormValues = z.input<ReturnType<typeof registerFormSchema>>;
export type RegisterFormOutput = z.output<ReturnType<typeof registerFormSchema>>;
export type ProfileFormValues = z.input<typeof profileFormSchema>;
export type ProfileFormOutput = z.output<typeof profileFormSchema>;
export type ChangePasswordFormValues = z.input<ReturnType<typeof changePasswordFormSchema>>;
export type ChangePasswordFormOutput = z.output<ReturnType<typeof changePasswordFormSchema>>;
