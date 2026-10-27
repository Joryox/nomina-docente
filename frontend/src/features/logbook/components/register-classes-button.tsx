"use client";

import { Check } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";

import { useQuickRegister } from "../hooks/use-logbook";

const texts = TEXTS.logbookActions;

export interface ClassToRegister {
  scheduleId: string;
  startTime: string;
  endTime: string;
}

interface RegisterClassesButtonProps extends Pick<ButtonProps, "variant" | "size" | "className"> {
  /** Fecha de las clases (todas del mismo día). */
  date: string;
  classes: readonly ClassToRegister[];
  label: string;
  /** Nombre accesible cuando el texto visible no basta («Registrar Redes, 07:00–09:00»). */
  accessibleLabel?: string;
}

/**
 * Registra en la bitácora clases del horario con sus horas programadas, en una sola
 * petición: si una falla, no se registra ninguna (RN-40) y el aviso dice por qué.
 */
export function RegisterClassesButton({
  date,
  classes,
  label,
  accessibleLabel,
  variant = "primary",
  size = "sm",
  className,
}: RegisterClassesButtonProps) {
  const register = useQuickRegister();

  const onClick = () => {
    if (register.isPending) {
      return;
    }
    register.mutate(
      {
        session_date: date,
        entries: classes.map((item) => ({
          schedule_id: item.scheduleId,
          start_time: item.startTime,
          end_time: item.endTime,
          notes: null,
        })),
      },
      {
        onSuccess: (result) => toast.success(texts.registered(result.results.length)),
        onError: (error) => toast.error(toUserMessage(error)),
      },
    );
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      loading={register.isPending}
      loadingLabel={texts.registering}
      aria-label={accessibleLabel}
      onClick={onClick}
    >
      <Check aria-hidden="true" />
      {label}
    </Button>
  );
}
