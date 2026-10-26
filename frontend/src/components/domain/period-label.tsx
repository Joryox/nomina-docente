import type { Fortnight } from "@/lib/api-types";
import { formatPeriod, formatPeriodName } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface PeriodLabelProps {
  period: {
    year: number;
    month: number;
    fortnight: Fortnight;
    start_date?: string;
    end_date?: string;
  };
  /** Agrega los días: «(16 al 31 de octubre)». Requiere `start_date` y `end_date`. */
  withRange?: boolean;
  className?: string;
}

/** Quincena como se nombra en todo el sistema: «2.ª quincena de octubre de 2026». */
export function PeriodLabel({ period, withRange = false, className }: PeriodLabelProps) {
  const { start_date: start, end_date: end } = period;
  const text =
    withRange && start && end
      ? formatPeriod({ ...period, start_date: start, end_date: end })
      : formatPeriodName(period);
  return start ? (
    <time dateTime={start} className={cn(className)}>
      {text}
    </time>
  ) : (
    <span className={cn(className)}>{text}</span>
  );
}
