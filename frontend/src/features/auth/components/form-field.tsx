import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FormFieldProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
}

/** Campo con etiqueta, ayuda y error asociados (`aria-describedby`, `aria-invalid`). */
export function FormField({
  id,
  label,
  hint,
  error,
  optionalLabel,
  "aria-describedby": extraDescription,
  ...inputProps
}: FormFieldProps) {
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null, extraDescription ?? null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {optionalLabel ? (
          <span className="font-normal text-muted-foreground">{optionalLabel}</span>
        ) : null}
      </Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
