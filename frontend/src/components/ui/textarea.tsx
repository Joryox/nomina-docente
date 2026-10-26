"use client";

import { useState, type ChangeEvent, type ComponentProps } from "react";

import { TEXTS } from "@/constants/texts";
import { cn } from "@/lib/utils";

import { controlSurface } from "./control-styles";
import { useFieldControl } from "./field";

interface TextareaProps extends ComponentProps<"textarea"> {
  /** Muestra «n de máx. caracteres» cuando hay `maxLength`. */
  showCount?: boolean;
}

export function Textarea({ className, showCount = false, onChange, ...props }: TextareaProps) {
  const controlProps = useFieldControl(props);
  const [typedLength, setTypedLength] = useState(String(props.defaultValue ?? "").length);
  const length = props.value === undefined ? typedLength : String(props.value).length;
  const withCounter = showCount && props.maxLength !== undefined;
  const counterId = withCounter && controlProps.id ? `${controlProps.id}-contador` : undefined;
  const describedBy = [controlProps["aria-describedby"], counterId].filter(Boolean).join(" ");

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setTypedLength(event.target.value.length);
    onChange?.(event);
  };

  return (
    <div className="grid gap-1">
      <textarea
        data-slot="textarea"
        className={cn(controlSurface, "min-h-24 resize-y px-3 py-2", className)}
        {...controlProps}
        onChange={handleChange}
        aria-describedby={describedBy || undefined}
      />
      {withCounter ? (
        <p id={counterId} className="justify-self-end text-small text-fg-muted figures">
          {TEXTS.ui.characterCount(length, props.maxLength ?? 0)}
        </p>
      ) : null}
    </div>
  );
}
