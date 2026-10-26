"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { choiceControl } from "./checkbox";
import { Label } from "./label";

/**
 * Opciones excluyentes y pocas (2 a 5) que conviene ver todas a la vez, como la quincena.
 * Va dentro de un Fieldset, que da la pregunta (`legend`).
 */
export function RadioGroup({
  className,
  ...props
}: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2.5", className)}
      {...props}
    />
  );
}

interface RadioGroupItemProps extends ComponentProps<typeof RadioGroupPrimitive.Item> {
  label: ReactNode;
  description?: ReactNode;
}

export function RadioGroupItem({
  label,
  description,
  className,
  id,
  ...props
}: RadioGroupItemProps) {
  const generatedId = useId();
  const itemId = id ?? `opcion-${generatedId}`;
  const descriptionId = description ? `${itemId}-descripcion` : undefined;

  return (
    <div className="flex items-start gap-2.5">
      <RadioGroupPrimitive.Item
        id={itemId}
        data-slot="radio-group-item"
        aria-describedby={descriptionId}
        className={cn(
          choiceControl,
          "mt-0.5 inline-flex size-4.5 items-center justify-center rounded-full",
          "data-[state=checked]:border-primary",
          className,
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
      </RadioGroupPrimitive.Item>
      <div className="grid gap-0.5">
        <Label htmlFor={itemId} className="font-normal">
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
