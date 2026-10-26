import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Icono que nombra lo que falta (un calendario para «sin sesiones»), no un adorno. */
  icon?: LucideIcon;
  /** Qué no hay: «Aún no registras sesiones en esta quincena». */
  title: string;
  /** Por qué y qué hacer: «Registra la primera clase desde tu horario de hoy». */
  description?: ReactNode;
  /** La acción que resuelve el vacío (normalmente un solo botón). */
  action?: ReactNode;
  className?: string;
}

/** Estado vacío útil: dice qué falta y cómo seguir. Sin ilustraciones genéricas. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      {Icon ? (
        <span
          aria-hidden="true"
          className="inline-flex size-10 items-center justify-center rounded-md border border-line bg-surface-sunken text-fg-muted"
        >
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="grid max-w-prose gap-1">
        <p className="text-label font-semibold text-fg">{title}</p>
        {description ? <div className="text-body text-fg-muted">{description}</div> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
