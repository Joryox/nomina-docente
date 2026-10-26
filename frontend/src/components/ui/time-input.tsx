"use client";

import { Clock } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { VALIDATION_MESSAGES } from "@/constants/error-messages";
import { TEXTS } from "@/constants/texts";
import {
  clockTimeToMinutes,
  DAY_BOUNDS,
  formatClockTime,
  maskTimeTyping,
  parseTimeInput,
  snapToStep,
  stepTime,
  timeOptions,
} from "@/lib/time-input";
import { cn } from "@/lib/utils";

import { controlHeight, controlSurface } from "./control-styles";
import { Field, useFieldControl } from "./field";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover";

const DEFAULT_STEP_MINUTES = 5;
const DEFAULT_LIST_STEP_MINUTES = 30;
const CLOCK_TIME_LENGTH = 5;

export interface TimeInputProps {
  /** Hora "HH:MM" (24 h) o `null`. */
  value: string | null;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  /** Intervalo en minutos: al salir del campo la hora se ajusta a él; las flechas avanzan así. */
  step?: number;
  /** Intervalo de la lista desplegable (más amplio, para no mostrar cientos de opciones). */
  listStep?: number;
  /** Límites "HH:MM" inclusivos. */
  min?: string;
  max?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

type Feedback = { kind: "invalid" | "snapped"; message: string } | null;

/**
 * Selector de hora de 24 h que previene errores: máscara al escribir ("730" → 07:30), sin
 * horas imposibles, ajuste al intervalo al salir, flechas ↑ ↓ por intervalos y lista de
 * horas frecuentes. Nunca entrega una hora inválida: o una "HH:MM" válida, o `null`.
 * `min` y `max` acotan la lista y las flechas.
 */
export function TimeInput({
  value,
  onChange,
  onBlur,
  step = DEFAULT_STEP_MINUTES,
  listStep = DEFAULT_LIST_STEP_MINUTES,
  min,
  max,
  disabled,
  className,
  name,
  ...props
}: TimeInputProps) {
  const controlProps = useFieldControl(props);
  const [draft, setDraft] = useState(value ?? "");
  const [syncedValue, setSyncedValue] = useState(value);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [listOpen, setListOpen] = useState(false);
  // Los límites acotan la lista y las flechas; una hora escrita fuera de ellos se respeta
  // para que el formulario explique el problema en lugar de cambiarla en silencio.
  const bounds = {
    min: (min ? clockTimeToMinutes(min) : null) ?? DAY_BOUNDS.min,
    max: (max ? clockTimeToMinutes(max) : null) ?? DAY_BOUNDS.max,
  };
  const feedbackId = controlProps.id ? `${controlProps.id}-hora` : undefined;

  // El valor cambió desde fuera (reinicio del formulario, precarga del horario).
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value ?? "");
    setFeedback(null);
  }

  const commit = (minutes: number | null) => {
    const next = minutes === null ? null : formatClockTime(minutes);
    setSyncedValue(next);
    setDraft(next ?? "");
    onChange(next);
  };

  const clampToBounds = (minutes: number) => Math.min(bounds.max, Math.max(bounds.min, minutes));

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const masked = maskTimeTyping(raw, raw.length < draft.length);
    setDraft(masked);
    setFeedback(null);
    const minutes = masked.length === CLOCK_TIME_LENGTH ? clockTimeToMinutes(masked) : null;
    if (minutes !== null) {
      setSyncedValue(masked);
      onChange(masked);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (event.relatedTarget?.closest("[data-time-list]")) {
      return;
    }
    if (!draft.trim()) {
      setFeedback(null);
      commit(null);
    } else {
      const parsed = parseTimeInput(draft);
      if (parsed === null) {
        setFeedback({ kind: "invalid", message: VALIDATION_MESSAGES.clockTime });
        setSyncedValue(null);
        onChange(null);
      } else {
        const adjusted = snapToStep(parsed, step);
        setFeedback(
          adjusted === parsed
            ? null
            : { kind: "snapped", message: TEXTS.ui.timeInput.snapped(step) },
        );
        commit(adjusted);
      }
    }
    onBlur?.();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
    event.preventDefault();
    const current = parseTimeInput(draft) ?? bounds.min;
    const direction = event.key === "ArrowUp" ? 1 : -1;
    setFeedback(null);
    commit(draft ? stepTime(current, direction, step, bounds) : clampToBounds(current));
  };

  const describedBy = [controlProps["aria-describedby"], feedback ? feedbackId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-1">
      <Popover open={listOpen} onOpenChange={setListOpen}>
        <PopoverAnchor asChild>
          <div className={cn("relative", className)}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              maxLength={CLOCK_TIME_LENGTH}
              placeholder={TEXTS.ui.timeInput.placeholder}
              name={name}
              disabled={disabled}
              value={draft}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              data-slot="time-input"
              className={cn(controlSurface, controlHeight, "pr-10 figures")}
              {...controlProps}
              aria-describedby={describedBy || undefined}
              aria-invalid={
                controlProps["aria-invalid"] ?? (feedback?.kind === "invalid" || undefined)
              }
            />
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label={TEXTS.ui.timeInput.openList}
                className="absolute inset-y-0 right-0 inline-flex w-9 items-center justify-center rounded-r-md text-fg-muted hover:text-fg disabled:cursor-not-allowed disabled:text-fg-disabled"
              >
                <Clock aria-hidden="true" className="size-4" />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-36 p-1">
          {listOpen ? (
            <TimeList
              options={timeOptions(listStep, bounds)}
              selected={value}
              onSelect={(minutes) => {
                setFeedback(null);
                commit(minutes);
                setListOpen(false);
              }}
            />
          ) : null}
        </PopoverContent>
      </Popover>
      {feedback ? (
        <p
          id={feedbackId}
          aria-live="polite"
          className={cn(
            "text-small",
            feedback.kind === "invalid" ? "text-danger-ink" : "text-fg-muted",
          )}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

function TimeList({
  options,
  selected,
  onSelect,
}: {
  options: number[];
  selected: string | null;
  onSelect: (minutes: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedMinutes = selected ? clockTimeToMinutes(selected) : null;
  const nearest =
    selectedMinutes === null
      ? options[0]
      : options.reduce((best, option) =>
          Math.abs(option - selectedMinutes) < Math.abs(best - selectedMinutes) ? option : best,
        );

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-minutes="${nearest}"]`)
      ?.scrollIntoView({ block: "center" });
    listRef.current?.querySelector<HTMLButtonElement>(`[data-minutes="${nearest}"]`)?.focus();
  }, [nearest]);

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = buttons[index + (event.key === "ArrowDown" ? 1 : -1)];
    next?.focus();
  };

  return (
    <div
      ref={listRef}
      data-time-list
      role="group"
      aria-label={TEXTS.ui.timeInput.listLabel}
      onKeyDown={moveFocus}
      className="grid max-h-60 overflow-y-auto"
    >
      {options.map((minutes) => {
        const label = formatClockTime(minutes);
        const isSelected = minutes === selectedMinutes;
        return (
          <button
            key={minutes}
            type="button"
            data-minutes={minutes}
            aria-pressed={isSelected}
            onClick={() => onSelect(minutes)}
            className={cn(
              "rounded-sm px-2 py-1.5 text-left text-body text-fg figures hover:bg-surface-hover",
              isSelected && "bg-primary-soft font-semibold text-primary-ink",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export interface TimeRangeValue {
  start: string | null;
  end: string | null;
}

export interface TimeRangeInputProps {
  value: TimeRangeValue;
  onChange: (value: TimeRangeValue) => void;
  step?: number;
  /** Duración mínima y máxima en minutos (GET /catalogs/business-rules). */
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  /** Errores del formulario; tienen prioridad sobre la revisión en vivo. */
  errors?: { start?: string; end?: string };
  required?: boolean;
  disabled?: boolean;
  startLabel?: string;
  endLabel?: string;
}

function durationText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return TEXTS.ui.timeRange.durationParts(hours, minutes % 60);
}

/**
 * Entrada y salida de una clase. La salida no puede ser anterior ni igual a la entrada: la
 * lista de la salida empieza después de la entrada y la duración se muestra en vivo.
 */
export function TimeRangeInput({
  value,
  onChange,
  step = DEFAULT_STEP_MINUTES,
  minDurationMinutes,
  maxDurationMinutes,
  errors,
  required = false,
  disabled,
  startLabel = TEXTS.ui.timeRange.start,
  endLabel = TEXTS.ui.timeRange.end,
}: TimeRangeInputProps) {
  const startMinutes = value.start ? clockTimeToMinutes(value.start) : null;
  const endMinutes = value.end ? clockTimeToMinutes(value.end) : null;
  const duration = startMinutes !== null && endMinutes !== null ? endMinutes - startMinutes : null;

  let liveError: string | undefined;
  if (duration !== null && duration <= 0) {
    liveError = VALIDATION_MESSAGES.endAfterStart;
  } else if (duration !== null && minDurationMinutes && duration < minDurationMinutes) {
    liveError = VALIDATION_MESSAGES.classTooShort(minDurationMinutes);
  } else if (duration !== null && maxDurationMinutes && duration > maxDurationMinutes) {
    liveError = VALIDATION_MESSAGES.classTooLong(maxDurationMinutes);
  }
  const endMin =
    startMinutes !== null
      ? formatClockTime(Math.min(startMinutes + step, DAY_BOUNDS.max))
      : undefined;

  return (
    <div className="grid gap-2">
      <div className="grid gap-(--field-gap) sm:grid-cols-2">
        <Field label={startLabel} required={required} error={errors?.start}>
          <TimeInput
            value={value.start}
            step={step}
            disabled={disabled}
            onChange={(start) => onChange({ ...value, start })}
          />
        </Field>
        <Field label={endLabel} required={required} error={errors?.end ?? liveError}>
          <TimeInput
            value={value.end}
            step={step}
            min={endMin}
            disabled={disabled}
            onChange={(end) => onChange({ ...value, end })}
          />
        </Field>
      </div>
      <p aria-live="polite" className="text-small text-fg-muted figures">
        {duration !== null && duration > 0
          ? TEXTS.ui.timeRange.duration(durationText(duration))
          : null}
      </p>
    </div>
  );
}
