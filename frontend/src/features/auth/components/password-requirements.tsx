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
    <div id={id} className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
      <p className="font-medium text-foreground">{texts.title}</p>
      <ul className="mt-1 grid gap-0.5">
        {policy.rules.map((rule) => {
          const met = password ? isMet(rule, policy, password) : null;
          return (
            <li
              key={rule}
              className={cn(
                met === true && "text-success",
                met === false && "text-destructive",
                met === null && "text-muted-foreground",
              )}
            >
              {describeRule(rule, policy)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
