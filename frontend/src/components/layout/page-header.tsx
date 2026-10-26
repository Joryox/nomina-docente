import type { ReactNode } from "react";

import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Único `h1` de la página. */
  title: ReactNode;
  description?: ReactNode;
  /**
   * Migas propias de la página. Dentro del panel la barra superior ya las muestra; úsalas
   * aquí solo fuera del panel o cuando la página tiene niveles que la barra no conoce.
   */
  breadcrumbs?: readonly BreadcrumbItem[];
  /** Acciones de la página; la primaria va al final (a la derecha). */
  actions?: ReactNode;
  /** Datos de contexto bajo el título (periodo, estado). */
  meta?: ReactNode;
  className?: string;
}

/** Encabezado de página: migas opcionales, título, descripción, contexto y acciones. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-(--section-gap) flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-5",
        className,
      )}
    >
      <div className="grid min-w-0 gap-1.5">
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} className="mb-1" /> : null}
        <h1 className="font-serif text-title text-fg">{title}</h1>
        {description ? <p className="max-w-prose text-body text-fg-muted">{description}</p> : null}
        {meta ? <div className="mt-1 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
