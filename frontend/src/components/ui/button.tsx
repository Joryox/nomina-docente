import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { TEXTS } from "@/constants/texts";
import { cn } from "@/lib/utils";

import { Spinner } from "./spinner";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-medium whitespace-nowrap select-none",
    "transition-colors duration-(--duration-fast) ease-standard",
    "disabled:cursor-not-allowed aria-disabled:cursor-not-allowed",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed",
          "disabled:bg-surface-sunken disabled:text-fg-disabled",
        ],
        secondary: [
          "bg-primary-soft text-primary-ink hover:bg-primary-soft-hover",
          "disabled:bg-surface-sunken disabled:text-fg-disabled",
        ],
        outline: [
          "border-line-strong bg-surface text-fg hover:bg-surface-hover active:bg-surface-sunken",
          "disabled:border-line disabled:bg-surface disabled:text-fg-disabled",
        ],
        ghost: [
          "text-fg hover:bg-surface-hover active:bg-surface-sunken",
          "disabled:bg-transparent disabled:text-fg-disabled",
        ],
        danger: [
          "bg-danger text-on-danger hover:bg-danger-hover",
          "disabled:bg-surface-sunken disabled:text-fg-disabled",
        ],
        link: [
          "h-auto border-0 px-0 text-primary-ink underline decoration-1 underline-offset-4 hover:decoration-2",
          "disabled:text-fg-disabled disabled:no-underline",
        ],
      },
      size: {
        sm: "h-(--control-height-sm) px-3 text-small",
        md: "h-(--control-height-md) px-4 text-label",
        lg: "h-(--control-height-lg) px-5 text-body",
        icon: "size-(--control-height-md) text-label",
        "icon-sm": "size-(--control-height-sm) text-small",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza el hijo (por ejemplo, un `Link`) con el estilo del botón. */
    asChild?: boolean;
    /** Muestra el indicador de carga sin cambiar el ancho y deshabilita el botón. */
    loading?: boolean;
    /** Texto para lectores de pantalla mientras carga. */
    loadingLabel?: string;
  };

/**
 * Botón del sistema. Una acción primaria por vista; las demás, `outline` o `ghost`.
 * `danger` solo para acciones destructivas, y siempre detrás de un diálogo de confirmación.
 */
export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingLabel = TEXTS.ui.processing,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    return (
      <Slot.Root data-slot="button" className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot="button"
      type={type ?? "button"}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>
        {children}
      </span>
      {loading ? (
        <span className="absolute inset-0 inline-flex items-center justify-center">
          <Spinner />
          <span className="sr-only">{loadingLabel}</span>
        </span>
      ) : null}
    </button>
  );
}

export { buttonVariants };
