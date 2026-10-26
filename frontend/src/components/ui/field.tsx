"use client";

import { CircleAlert } from "lucide-react";
import { createContext, useContext, useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { TEXTS } from "@/constants/texts";
import { cn } from "@/lib/utils";

import { Label } from "./label";

interface FieldContextValue {
  controlId: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

interface ControlA11yProps {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
}

/**
 * Conecta un control con su Field: id de la etiqueta, ayuda y error en `aria-describedby`,
 * `aria-invalid` y `required`. Lo que el control recibe explícitamente tiene prioridad.
 */
export function useFieldControl<TProps extends ControlA11yProps>(props: TProps): TProps {
  const field = useContext(FieldContext);
  if (!field) {
    return props;
  }
  const describedBy = [field.describedBy, props["aria-describedby"]].filter(Boolean).join(" ");
  return {
    ...props,
    id: props.id ?? field.controlId,
    required: props.required ?? (field.required || undefined),
    "aria-describedby": describedBy || undefined,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
  };
}

export interface FieldProps {
  label: ReactNode;
  /** Ayuda permanente: qué capturar y en qué formato. Va entre la etiqueta y el control. */
  hint?: ReactNode;
  /** Mensaje de error: qué pasó y cómo corregirlo. */
  error?: string;
  required?: boolean;
  /** Id del control; si no se da, se genera. */
  id?: string;
  /** Oculta la etiqueta visualmente (sigue disponible para lectores de pantalla). */
  labelHidden?: boolean;
  className?: string;
  children: ReactNode;
}

/** Envoltorio de un campo: etiqueta, marca de obligatorio, ayuda, control y error. */
export function Field({
  label,
  hint,
  error,
  required = false,
  id,
  labelHidden = false,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? `campo-${generatedId}`;
  const hintId = `${controlId}-ayuda`;
  const errorId = `${controlId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div
      data-slot="field"
      data-invalid={error ? true : undefined}
      className={cn("grid content-start gap-1.5", className)}
    >
      <Label htmlFor={controlId} className={cn(labelHidden && "sr-only")}>
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      {hint ? (
        <p id={hintId} className="text-small text-fg-muted">
          {hint}
        </p>
      ) : null}
      <FieldContext.Provider
        value={{
          controlId,
          describedBy: describedBy || undefined,
          invalid: Boolean(error),
          required,
        }}
      >
        {children}
      </FieldContext.Provider>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export type FieldsetProps = Omit<FieldProps, "id" | "labelHidden">;

/** Grupo de opciones (radios, casillas): `fieldset` con `legend`, ayuda y error. */
export function Fieldset({
  label,
  hint,
  error,
  required = false,
  className,
  children,
}: FieldsetProps) {
  const groupId = `grupo-${useId()}`;
  const hintId = `${groupId}-ayuda`;
  const errorId = `${groupId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <fieldset
      data-slot="fieldset"
      aria-describedby={describedBy || undefined}
      className={cn("grid gap-2", className)}
    >
      <legend className="mb-1.5 text-label text-fg">
        <span className="inline-flex items-baseline gap-1">
          {label}
          {required ? <RequiredMark /> : null}
        </span>
      </legend>
      {hint ? (
        <p id={hintId} className="-mt-1 text-small text-fg-muted">
          {hint}
        </p>
      ) : null}
      {children}
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-danger-ink">
        *
      </span>
      <span className="sr-only">({TEXTS.ui.required})</span>
    </>
  );
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) {
    return null;
  }
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-small text-danger-ink">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/** Nota al inicio de un formulario de captura que marca los obligatorios con *. */
export function FormRequiredNote({ className }: { className?: string }) {
  return <p className={cn("text-small text-fg-muted", className)}>{TEXTS.ui.requiredNote}</p>;
}

interface FormFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> extends Omit<FieldProps, "error" | "children"> {
  control: Control<TValues>;
  name: TName;
  render: (field: ControllerRenderProps<TValues, TName>, state: ControllerFieldState) => ReactNode;
}

/**
 * Field conectado a React Hook Form: el error sale del estado del campo. Es para controles
 * que no son `input` nativos (Select, Combobox, fecha, hora) y necesitan `value`/`onChange`;
 * con un `input` nativo basta `register()` dentro de un Field.
 */
export function FormField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  render,
  ...fieldProps
}: FormFieldProps<TValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field {...fieldProps} error={fieldState.error?.message}>
          {render(field, fieldState)}
        </Field>
      )}
    />
  );
}
