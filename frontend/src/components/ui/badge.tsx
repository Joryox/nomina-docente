import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-small font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-sunken text-fg-muted",
        primary: "border-transparent bg-primary-soft text-primary-ink",
        success: "border-success-line bg-success-soft text-success-ink",
        warning: "border-warning-line bg-warning-soft text-warning-ink",
        danger: "border-danger-line bg-danger-soft text-danger-ink",
        info: "border-info-line bg-info-soft text-info-ink",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

/**
 * Etiqueta de estado, de esquinas rectas como un sello. Siempre con texto (nunca solo
 * color) y, si ayuda a reconocerla, con un icono.
 */
export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}
