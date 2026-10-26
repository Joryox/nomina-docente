import { TEXTS } from "@/constants/texts";
import { formatHours } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface HoursProps {
  /** Cadena decimal de la API ("12.50"). */
  value: string;
  className?: string;
}

/** Horas trabajadas con 2 decimales y cifras tabulares: `12.50 h`. */
export function Hours({ value, className }: HoursProps) {
  const suffix = ` ${TEXTS.calendar.hoursSuffix}`;
  const figure = formatHours(value).replace(suffix, "");
  return (
    <span className={cn("whitespace-nowrap figures", className)}>
      {figure}
      <span className="ml-0.5 text-unit font-normal text-fg-muted">
        {TEXTS.calendar.hoursSuffix}
      </span>
    </span>
  );
}
