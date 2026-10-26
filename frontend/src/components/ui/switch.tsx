"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Label } from "./label";

interface SwitchProps extends ComponentProps<typeof SwitchPrimitive.Root> {
  label: ReactNode;
  description?: ReactNode;
}

/**
 * Interruptor para preferencias que surten efecto al instante (sin botón Guardar). En un
 * formulario que se envía, usa Checkbox.
 */
export function Switch({ label, description, className, id, ...props }: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? `interruptor-${generatedId}`;
  const descriptionId = description ? `${switchId}-descripcion` : undefined;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-0.5">
        <Label htmlFor={switchId}>{label}</Label>
        {description ? (
          <p id={descriptionId} className="text-small text-fg-muted">
            {description}
          </p>
        ) : null}
      </div>
      <SwitchPrimitive.Root
        id={switchId}
        data-slot="switch"
        aria-describedby={descriptionId}
        className={cn(
          "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-line-strong bg-surface-sunken p-0.5",
          "transition-colors duration-(--duration-fast) ease-standard",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            "block size-3.5 rounded-full bg-fg-muted shadow-xs",
            "transition-transform duration-(--duration-fast) ease-standard",
            "data-[state=checked]:translate-x-4 data-[state=checked]:bg-on-primary",
          )}
        />
      </SwitchPrimitive.Root>
    </div>
  );
}
