import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Skeleton } from "./skeleton";

interface StatCardProps {
  /** Qué se mide: «Total de la quincena». */
  label: string;
  /** La cifra, normalmente con Money o Hours. */
  value: ReactNode;
  /** Contexto de la cifra: «39.00 h en 13 sesiones». */
  description?: ReactNode;
  /** Enlace o acción para ver el detalle. */
  footer?: ReactNode;
  /** Marca el indicador principal de la vista (borde superior en color primario). */
  emphasis?: boolean;
  loading?: boolean;
  className?: string;
}

/**
 * Indicador del panel. Pocos por vista (3 o 4) y con jerarquía: uno principal y los demás de
 * apoyo. La cifra es la protagonista; no lleva iconos decorativos.
 */
export function StatCard({
  label,
  value,
  description,
  footer,
  emphasis = false,
  loading = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-line bg-surface",
        emphasis && "border-t-(length:--border-width-strong) border-t-primary",
        className,
      )}
    >
      <dl className="grid flex-1 gap-1 px-5 py-4">
        <dt className="text-overline text-fg-muted uppercase">{label}</dt>
        <dd className="text-figure text-fg figures">
          {loading ? <Skeleton className="mt-1 h-8 w-32" /> : value}
        </dd>
        {description ? (
          <dd className="text-small text-fg-muted">
            {loading ? <Skeleton className="h-4 w-40" /> : description}
          </dd>
        ) : null}
      </dl>
      {footer ? <div className="border-t border-line px-5 py-2.5 text-small">{footer}</div> : null}
    </div>
  );
}
