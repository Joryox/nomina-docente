import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Bloque de carga con la forma del contenido que viene. Decorativo: anuncia la carga en texto. */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("animate-pulse rounded-sm bg-surface-sunken", className)}
      {...props}
    />
  );
}
