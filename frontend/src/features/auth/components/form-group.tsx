import type { ReactNode } from "react";

/** Grupo de campos de un formulario largo («Datos personales», «Datos de acceso»). */
export function FormGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid gap-(--field-gap)">
      <legend className="mb-(--field-gap) grid gap-0.5 border-b border-line pb-2">
        <span className="text-subtitle text-fg">{title}</span>
        {hint ? <span className="text-small text-fg-muted">{hint}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}
