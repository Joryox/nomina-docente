"use client";

import { Check, Minus } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Label } from "./label";

interface CheckboxProps extends ComponentProps<typeof CheckboxPrimitive.Root> {
  /** Etiqueta junto a la casilla. Sin ella, la casilla necesita `aria-label`. */
  label?: ReactNode;
  description?: ReactNode;
}

export const choiceControl = [
  "peer shrink-0 border border-line-strong bg-surface text-on-primary",
  "transition-colors duration-(--duration-fast) ease-standard hover:border-fg-muted",
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken",
  "aria-invalid:border-danger-ink",
].join(" ");

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? `casilla-${generatedId}`;
  const descriptionId = description ? `${checkboxId}-descripcion` : undefined;

  const control = (
    <CheckboxPrimitive.Root
      id={checkboxId}
      data-slot="checkbox"
      aria-describedby={descriptionId}
      className={cn(
        choiceControl,
        "mt-0.5 inline-flex size-4.5 items-center justify-center rounded-xs",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
        "disabled:data-[state=checked]:border-line-strong disabled:data-[state=checked]:bg-fg-disabled",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="inline-flex">
        {props.checked === "indeterminate" ? (
          <Minus aria-hidden="true" className="size-3.5" strokeWidth={3} />
        ) : (
          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label) {
    return control;
  }
  return (
    <div className="flex items-start gap-2.5">
      {control}
      <div className="grid gap-0.5">
        <Label htmlFor={checkboxId} className="font-normal">
          {label}
        </Label>
        {description ? (
          <p id={descriptionId} className="text-small text-fg-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
