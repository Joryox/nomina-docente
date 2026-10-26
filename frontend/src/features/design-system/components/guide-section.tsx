import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GuideSectionProps {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Sección de la guía con ancla para el índice. */
export function GuideSection({ id, title, description, children, className }: GuideSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className={cn(
        "grid min-w-0 scroll-mt-6 grid-cols-1 gap-5 border-t border-line pt-8",
        className,
      )}
    >
      <div className="grid gap-1">
        <h2 id={`${id}-titulo`} className="font-serif text-title text-fg">
          {title}
        </h2>
        {description ? <p className="max-w-prose text-body text-fg-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Subtítulo y bloque de ejemplos dentro de una sección. */
export function GuideExample({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="grid gap-3">
      <h3 className="text-overline text-fg-muted uppercase">{title}</h3>
      <div
        className={cn(
          "flex flex-wrap items-start gap-3 rounded-lg border border-line bg-surface p-5",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Nombre de un token o una clase, en monoespaciada. */
export function TokenName({ children }: { children: ReactNode }) {
  return <code className="font-mono text-small text-fg-muted">{children}</code>;
}
