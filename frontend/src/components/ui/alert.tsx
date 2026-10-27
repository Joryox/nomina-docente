import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-md border border-l-4 px-4 py-3 text-body", {
  variants: {
    tone: {
      info: "border-info-line border-l-info-ink bg-info-soft",
      success: "border-success-line border-l-success-ink bg-success-soft",
      warning: "border-warning-line border-l-warning-ink bg-warning-soft",
      danger: "border-danger-line border-l-danger-ink bg-danger-soft",
    },
  },
  defaultVariants: { tone: "info" },
});

type AlertTone = NonNullable<VariantProps<typeof alertVariants>["tone"]>;

const TONE_ICON: Record<AlertTone, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
};

const TONE_INK: Record<AlertTone, string> = {
  info: "text-info-ink",
  success: "text-success-ink",
  warning: "text-warning-ink",
  danger: "text-danger-ink",
};

interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: ReactNode;
  children?: ReactNode;
  /** Acción relacionada (un botón o enlace). */
  action?: ReactNode;
  /**
   * `true` si el aviso aparece como respuesta a algo que hizo la persona (error al guardar):
   * se anuncia a los lectores de pantalla. Los avisos fijos de la página no se anuncian.
   */
  announce?: boolean;
  className?: string;
}

/** Aviso dentro de la página: qué pasó y qué hacer. Para confirmaciones breves, toast. */
export function Alert({ tone = "info", title, children, action, announce, className }: AlertProps) {
  const resolvedTone = tone ?? "info";
  const Icon = TONE_ICON[resolvedTone];
  const role = announce ? (resolvedTone === "danger" ? "alert" : "status") : undefined;

  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(
        alertVariants({ tone }),
        // Un aviso que responde a una acción aparece con suavidad para que se note.
        announce &&
          "animate-in duration-(--duration-base) ease-enter fade-in-0 slide-in-from-top-1",
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", TONE_INK[resolvedTone])} />
      <div className="grid flex-1 gap-1">
        {title ? <p className="font-semibold text-fg">{title}</p> : null}
        {children ? <div className="text-fg">{children}</div> : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </div>
  );
}
