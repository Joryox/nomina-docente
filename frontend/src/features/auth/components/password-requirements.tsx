import { Check, Circle, X } from "lucide-react";

import { TEXTS } from "@/constants/texts";
import {
  DIGIT_PATTERN,
  LETTER_PATTERN,
  PASSWORD_PERSONAL_DATA_MIN_LENGTH,
  PASSWORD_PERSONAL_DATA_SEPARATORS,
} from "@/constants/validation";
import { cn } from "@/lib/utils";

import type { PasswordPolicy, PasswordRule } from "../types/auth";

const texts = TEXTS.auth.passwordRequirements;

/** Texto en español de cada requisito, con los parámetros que publica el backend. */
export function describeRule(rule: PasswordRule, policy: PasswordPolicy): string {
  switch (rule) {
    case "min_length":
      return texts.rules.min_length(policy.min_length);
    case "max_length":
      return texts.rules.max_length(policy.max_length);
    default:
      return texts.rules[rule]();
  }
}

/** Minúsculas y sin acentos, como compara el servidor. */
function fold(value: string): string {
  return value.normalize("NFKD").toLocaleLowerCase("es-MX").replace(/\p{M}/gu, "");
}

/** Partes del nombre y del correo (solo la parte local) que la contraseña no puede contener. */
function personalParts(personalData: readonly string[]): string[] {
  return personalData.flatMap((value) => {
    const folded = fold(value).split("@")[0] ?? "";
    return [folded, ...folded.split(PASSWORD_PERSONAL_DATA_SEPARATORS)].filter(
      (part) => part.length >= PASSWORD_PERSONAL_DATA_MIN_LENGTH,
    );
  });
}

export interface RuleContext {
  policy: PasswordPolicy;
  password: string;
  personalData: readonly string[];
  currentPassword: string | undefined;
}

/**
 * `true`/`false` si el requisito se puede revisar en el navegador; `null` si solo lo puede
 * revisar el servidor (contraseñas comunes) o aún faltan datos para revisarlo.
 */
export function isRuleMet(rule: PasswordRule, context: RuleContext): boolean | null {
  const { policy, password } = context;
  switch (rule) {
    case "min_length":
      return password.length >= policy.min_length;
    case "max_length":
      return password.length <= policy.max_length;
    case "letter_required":
      return LETTER_PATTERN.test(password);
    case "digit_required":
      return DIGIT_PATTERN.test(password);
    case "no_personal_data": {
      const parts = personalParts(context.personalData);
      if (parts.length === 0) {
        return null;
      }
      const folded = fold(password);
      return !parts.some((part) => folded.includes(part));
    }
    case "not_current":
      return context.currentPassword ? password !== context.currentPassword : null;
    default:
      return null;
  }
}

export function PasswordRequirements({
  id,
  policy,
  password,
  personalData = [],
  currentPassword,
  showNotCurrent = false,
}: {
  id: string;
  policy: PasswordPolicy;
  password: string;
  /** Nombre, apellidos y correo de la persona, para revisar ese requisito en vivo. */
  personalData?: readonly string[];
  currentPassword?: string;
  /** «Distinta de la actual» solo aplica al cambiar la contraseña. */
  showNotCurrent?: boolean;
}) {
  // «Distinta de la actual» solo tiene sentido al cambiarla; el servidor siempre la exige ahí.
  const rules: PasswordRule[] = policy.rules.filter((rule) => rule !== "not_current");
  if (showNotCurrent) {
    rules.push("not_current");
  }
  return (
    <div id={id} className="rounded-md border border-line bg-surface-sunken px-3 py-2.5 text-small">
      <p className="font-medium text-fg">{texts.title}</p>
      <ul className="mt-1 grid gap-1">
        {rules.map((rule) => {
          const met = password
            ? isRuleMet(rule, { policy, password, personalData, currentPassword })
            : null;
          return (
            <li
              key={rule}
              className={cn(
                "flex items-start gap-1.5",
                met === true && "text-success-ink",
                met === false && "text-danger-ink",
                met === null && "text-fg-muted",
              )}
            >
              <RuleIcon met={met} />
              <span>
                {describeRule(rule, policy)}
                {met !== null ? (
                  <span className="sr-only"> ({met ? texts.met : texts.notMet})</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** El estado de cada requisito se distingue por el icono, no solo por el color. */
function RuleIcon({ met }: { met: boolean | null }) {
  const Icon = met === true ? Check : met === false ? X : Circle;
  return (
    <Icon
      aria-hidden="true"
      className={cn("mt-0.5 shrink-0", met === null ? "size-3" : "size-4")}
    />
  );
}
