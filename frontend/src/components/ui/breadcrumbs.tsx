import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { TEXTS } from "@/constants/texts";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  /** Sin `href`, es la página actual. */
  href?: string;
}

/** Ruta de navegación. El último elemento es la página actual (`aria-current="page"`). */
export function Breadcrumbs({
  items,
  className,
}: {
  items: readonly BreadcrumbItem[];
  className?: string;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <nav aria-label={TEXTS.layout.breadcrumbs} className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1.5 text-small text-fg-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate rounded-xs underline-offset-4 hover:text-fg hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="truncate font-medium text-fg"
                >
                  {item.label}
                </span>
              )}
              {!isLast ? <ChevronRight aria-hidden="true" className="size-3.5 shrink-0" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
