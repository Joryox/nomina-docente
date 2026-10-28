"use client";

import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { Fieldset } from "@/components/ui/field";
import { TEXTS } from "@/constants/texts";
import type { Weekday } from "@/lib/api-types";
import { cn } from "@/lib/utils";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const satisfies readonly Weekday[];

interface WeekdayPickerProps {
  label: string;
  value: Weekday[];
  onChange: (value: Weekday[]) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
}

/**
 * Casillas de los días de la semana (L M X J V S D). Cada una se anuncia con el nombre
 * completo del día; la selección se devuelve siempre en orden, de lunes a domingo.
 */
export function WeekdayPicker({ label, value, onChange, onBlur, error, hint }: WeekdayPickerProps) {
  const toggle = (day: Weekday, checked: boolean) => {
    const next = checked ? [...value, day] : value.filter((item) => item !== day);
    onChange([...new Set(next)].sort((a, b) => a - b));
  };

  return (
    <Fieldset label={label} hint={hint} error={error} required>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((day) => (
          <CheckboxPrimitive.Root
            key={day}
            checked={value.includes(day)}
            onCheckedChange={(checked) => toggle(day, checked === true)}
            onBlur={onBlur}
            aria-label={TEXTS.calendar.weekdays[day]}
            aria-invalid={error ? true : undefined}
            className={cn(
              "inline-flex size-(--control-height-md) items-center justify-center rounded-sm",
              "border border-line-strong bg-surface text-label font-semibold text-fg",
              "transition-colors duration-(--duration-fast) ease-standard hover:border-fg-muted",
              "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
              "aria-invalid:border-danger-ink data-[state=checked]:text-on-primary",
            )}
          >
            <span aria-hidden="true">{TEXTS.calendar.weekdaysLetter[day]}</span>
          </CheckboxPrimitive.Root>
        ))}
      </div>
    </Fieldset>
  );
}
