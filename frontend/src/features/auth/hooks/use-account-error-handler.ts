import { z } from "zod";

import { ApiError } from "@/lib/api-error";
import type { ApiErrorCode } from "@/lib/api-types";
import { applyServerFieldErrors } from "@/lib/form-errors";

import { describeRule } from "../components/password-requirements";
import { passwordRuleSchema } from "../schemas/password-policy";
import type { PasswordPolicy } from "../types/auth";

const brokenRulesSchema = z.object({ rules: z.array(passwordRuleSchema).min(1) });

interface AccountErrorConfig<TField extends string> {
  /** Campos del formulario que pueden recibir errores de validación del servidor. */
  fields: readonly TField[];
  /** Errores de negocio que corresponden a un campo concreto. */
  byCode?: Partial<Record<ApiErrorCode, TField>>;
  /** Campo de la contraseña nueva: recibe los requisitos que el servidor rechazó. */
  passwordField?: TField;
}

/**
 * Coloca cada error del servidor en su campo (correo repetido, número de empleado, requisitos
 * de la contraseña, contraseña actual incorrecta). Lo que no corresponde a un campo se
 * muestra como aviso general del formulario (`isGeneral`).
 */
export function useAccountErrorHandler<TField extends string>(
  policy: PasswordPolicy,
  { fields, byCode = {}, passwordField }: AccountErrorConfig<TField>,
  setFieldError: (field: TField, message: string) => void,
) {
  const fieldFor = (error: ApiError): TField | undefined =>
    (byCode as Partial<Record<string, TField>>)[error.code];

  const brokenRules = (error: ApiError) =>
    passwordField ? brokenRulesSchema.safeParse(error.details).data?.rules : undefined;

  const handleError = (error: unknown) => {
    if (!(error instanceof ApiError)) {
      return;
    }
    const field = fieldFor(error);
    if (field) {
      setFieldError(field, error.message);
      return;
    }
    const rules = brokenRules(error);
    if (rules && passwordField) {
      setFieldError(passwordField, rules.map((rule) => describeRule(rule, policy)).join(" "));
      return;
    }
    applyServerFieldErrors(error, fields, setFieldError);
  };

  /** `true` si el error no se puede mostrar junto a un campo. */
  const isGeneral = (error: unknown): boolean => {
    if (!error) {
      return false;
    }
    if (!(error instanceof ApiError)) {
      return true;
    }
    return !fieldFor(error) && !brokenRules(error) && !error.is("VALIDATION_ERROR");
  };

  return { handleError, isGeneral };
}
