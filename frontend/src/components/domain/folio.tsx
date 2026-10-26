import { cn } from "@/lib/utils";

/** Folio de un recibo (`NOM-202610-Q2-000042`) en monoespaciada: se lee y se dicta sin errores. */
export function Folio({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("font-mono tracking-tight whitespace-nowrap", className)}>{value}</span>
  );
}
