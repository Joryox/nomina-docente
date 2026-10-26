import { CURRENCY } from "@/constants/locale";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface MoneyProps {
  /** Cadena decimal de la API ("1250.00"); nunca un `number`. */
  amount: string;
  className?: string;
}

/** Monto en pesos con cifras tabulares: `$1,250.00 MXN`, con el sufijo de moneda más tenue. */
export function Money({ amount, className }: MoneyProps) {
  const figure = formatMoney(amount).replace(` ${CURRENCY}`, "");
  return (
    <span className={cn("whitespace-nowrap figures", className)}>
      {figure}
      <span className="ml-1 text-unit font-normal text-fg-muted">{CURRENCY}</span>
    </span>
  );
}
