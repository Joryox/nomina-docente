import Link from "next/link";
import type { ReactNode } from "react";

import { APP_ROUTES } from "@/constants/routes";

import { Logo } from "./logo";
import { ThemeSwitcher } from "./theme-switcher";

/** Encabezado de las páginas públicas (errores, guía viva): marca y tema. */
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-t-4 border-b border-t-primary border-b-line bg-surface">
      <div className="mx-auto flex max-w-content items-center gap-4 px-(--page-gutter) py-3">
        <Link href={APP_ROUTES.home} className="min-w-0 rounded-sm">
          <Logo variant="full" />
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {children}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
