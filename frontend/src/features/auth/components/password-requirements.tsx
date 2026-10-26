import { Check, Circle, X } from "lucide-react";

import { TEXTS } from "@/constants/texts";
import { DIGIT_PATTERN, LETTER_PATTERN } from "@/constants/validation";
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

/** `true`/`false` si el requisito se puede revisar en el navegador; `null` si lo revisa el servidor. */
function isMet(rule: PasswordRule, policy: PasswordPolicy, password: string): boolean | null {
  switch (rule) {
    case "min_length":
      return password.length >= policy.min_length;
    case "max_length":
      return password.length <= policy.max_length;
    case "letter_required":
      return LETTER_PATTERN.test(password);
    case "digit_required":
      return DIGIT_PATTERN.test(password);
    default:
      return null;
  }
}

export function PasswordRequirements({
  id,
  policy,
  password,
}: {
  id: string;
  policy: PasswordPolicy;
  password: string;
}) {
  return (
    <div
      id={id}
      className="-mt-2 rounded-md border border-line bg-surface-sunken px-3 py-2.5 text-small"
    >
      <p className="font-medium text-fg">{texts.title}</p>
      <ul className="mt-1 grid gap-1">
        {policy.rules.map((rule) => {
          const met = password ? isMet(rule, policy, password) : null;
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
