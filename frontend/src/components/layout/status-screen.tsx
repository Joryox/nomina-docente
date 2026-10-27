import type { ReactNode } from "react";

import { MAIN_CONTENT_ID } from "./skip-link";
import { SiteHeader } from "./site-header";

interface StatusScreenProps {
  /** Código breve sobre el título («Error 404»). */
  code: string;
  title: string;
  description: string;
  actions: ReactNode;
}

/** Pantalla completa para una página inexistente o un error inesperado. */
export function StatusScreen({ code, title, description, actions }: StatusScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />
      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="flex flex-1 items-center justify-center px-(--page-gutter) py-(--page-block) outline-none"
      >
        <div className="grid w-full max-w-form gap-4 border-l-4 border-primary pl-6">
          <p className="text-overline text-fg-muted uppercase">{code}</p>
          <h1 className="font-serif text-title text-fg">{title}</h1>
          <p className="max-w-prose text-body text-fg-muted">{description}</p>
          <div className="mt-2 flex flex-wrap gap-2">{actions}</div>
        </div>
      </main>
    </div>
  );
}
