"use client";

import { CalendarDays } from "lucide-react";
import { useRef, useState, type FocusEventHandler } from "react";
import type { Matcher } from "react-day-picker";

import { TEXTS } from "@/constants/texts";
import { isoToLocalDate, localDateToIso, todayIso } from "@/lib/calendar";
import { formatLongDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { controlHeight, controlSurface } from "./control-styles";
import { useFieldControl } from "./field";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface DatePickerProps {
  /** Fecha ISO ("2026-10-15") o `null`. */
  value: string | null;
  onChange: (value: string | null) => void;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  /** Primera fecha permitida (ISO). */
  min?: string;
  /** Última fecha permitida (ISO). */
  max?: string;
  /** Sin fechas posteriores a hoy (en la Ciudad de México). Se combina con `max`. */
  disableFuture?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/**
 * Selector de fecha. La persona elige del calendario (no escribe), así que la fecha siempre
 * es válida; las fechas fuera de `min`/`max` aparecen tachadas y no se pueden elegir. «Hoy»
 * es el día en la Ciudad de México, no en el reloj del equipo.
 */
export function DatePicker({
  value,
  onChange,
  onBlur,
  min,
  max,
  disableFuture = false,
  placeholder = TEXTS.ui.datePicker.placeholder,
  disabled,
  className,
  ...props
}: DatePickerProps) {
  const controlProps = useFieldControl(props);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onBlur={onBlur}
          aria-haspopup="dialog"
          data-slot="date-picker-trigger"
          className={cn(
            controlSurface,
            controlHeight,
            "flex items-center justify-between gap-2 text-left",
            !value && "text-fg-muted",
            className,
          )}
          {...controlProps}
        >
          <span className="truncate">{value ? formatLongDate(value) : placeholder}</span>
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto"
        aria-label={TEXTS.ui.datePicker.openCalendar}
        // El calendario se desmonta al elegir; sin esto, dentro de un diálogo el foco quedaba
        // en el cuerpo de la página en lugar de volver al campo.
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        {open ? (
          <DatePickerCalendar
            value={value}
            min={min}
            max={max}
            disableFuture={disableFuture}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/** Solo se monta con el calendario abierto: «hoy» se calcula en el navegador, no al prerenderizar. */
function DatePickerCalendar({
  value,
  min,
  max: requestedMax,
  disableFuture,
  onSelect,
}: {
  value: string | null;
  min?: string;
  max?: string;
  disableFuture: boolean;
  onSelect: (value: string | null) => void;
}) {
  const today = todayIso();
  const max = disableFuture && (!requestedMax || requestedMax > today) ? today : requestedMax;
  const minDate = min ? isoToLocalDate(min) : undefined;
  const maxDate = max ? isoToLocalDate(max) : undefined;
  const disabledDays: Matcher[] = [];
  if (minDate) disabledDays.push({ before: minDate });
  if (maxDate) disabledDays.push({ after: maxDate });
  const todayAllowed = (!min || today >= min) && (!max || today <= max);
  const selected = value ? isoToLocalDate(value) : undefined;

  return (
    <div className="grid gap-3">
      <Calendar
        mode="single"
        selected={selected}
        defaultMonth={selected ?? maxDate ?? isoToLocalDate(today)}
        today={isoToLocalDate(today)}
        startMonth={minDate}
        endMonth={maxDate}
        disabled={disabledDays}
        onSelect={(date) => onSelect(date ? localDateToIso(date) : null)}
        autoFocus
      />
      {todayAllowed ? (
        <div className="flex justify-end border-t border-line pt-2">
          <Button variant="ghost" size="sm" onClick={() => onSelect(today)}>
            {TEXTS.ui.datePicker.today}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
