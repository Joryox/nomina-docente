"use client";

import { TriangleAlert } from "lucide-react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import { useState, type ReactNode } from "react";

import { TEXTS } from "@/constants/texts";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { dialogPanelClasses, overlayClasses } from "./dialog";

export interface ConfirmDialogProps {
  /** Botón u otro elemento que abre el diálogo. Sin él, se controla con `open`. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pregunta concreta: «¿Borrar la asignación Bases de Datos – ISC?». */
  title: string;
  /** Qué va a pasar, en una o dos frases. */
  description: ReactNode;
  /** Lo que se pierde o queda fijo, uno por renglón. */
  consequences?: readonly string[];
  /** Verbo de la acción: «Borrar asignación», «Emitir recibo». Nunca «Aceptar». */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` para borrar; `primary` para acciones irreversibles que no destruyen (emitir). */
  tone?: "danger" | "primary";
  /** Si es asíncrona, el botón muestra carga y el diálogo se cierra al terminar bien. */
  onConfirm: () => void | Promise<void>;
  irreversible?: boolean;
}

/**
 * Confirmación explícita antes de una acción destructiva o irreversible (CLAUDE.md, principio
 * rector). Explica qué se va a perder. El foco inicial va a «Cancelar», no a la acción.
 */
export function ConfirmDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  consequences = [],
  confirmLabel,
  cancelLabel = TEXTS.ui.cancel,
  tone = "danger",
  onConfirm,
  irreversible = true,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const open = controlledOpen ?? internalOpen;

  const setOpen = (next: boolean) => {
    if (pending) {
      return;
    }
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      setPending(false);
      setOpen(false);
    } catch {
      // Quien llama muestra el error (toast o aviso); el diálogo queda abierto para reintentar.
      setPending(false);
    }
  };

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {trigger ? (
        <AlertDialogPrimitive.Trigger asChild>{trigger}</AlertDialogPrimitive.Trigger>
      ) : null}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlayClasses} />
        <AlertDialogPrimitive.Content className={dialogPanelClasses}>
          <div className="flex gap-3 px-5 pt-5">
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-md",
                tone === "danger"
                  ? "bg-danger-soft text-danger-ink"
                  : "bg-primary-soft text-primary-ink",
              )}
            >
              <TriangleAlert className="size-5" />
            </span>
            <div className="grid gap-1">
              <AlertDialogPrimitive.Title className="text-subtitle text-fg">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description asChild>
                <div className="grid gap-3 text-body text-fg-muted">
                  <div>{description}</div>
                  {consequences.length > 0 ? (
                    <div className="grid gap-1">
                      <p className="font-semibold text-fg">{TEXTS.ui.confirm.lossTitle}</p>
                      <ul className="grid list-disc gap-0.5 pl-5 text-fg">
                        {consequences.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {irreversible ? (
                    <p className="font-medium text-fg">{TEXTS.ui.confirm.irreversible}</p>
                  ) : null}
                </div>
              </AlertDialogPrimitive.Description>
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line px-5 py-3 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" disabled={pending}>
                {cancelLabel}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              loading={pending}
              onClick={() => void confirm()}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
