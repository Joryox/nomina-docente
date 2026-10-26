"use client";

import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from "sonner";

import { TEXTS } from "@/constants/texts";

/**
 * Notificaciones breves que confirman una acción («Sesión registrada»). Se van solas, así
 * que nunca llevan información que la persona necesite conservar ni el único aviso de un
 * error: los errores de un formulario se muestran en el formulario.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      containerAriaLabel={TEXTS.ui.notifications}
      icons={{
        success: <CircleCheck aria-hidden="true" className="size-5 text-success-ink" />,
        error: <CircleAlert aria-hidden="true" className="size-5 text-danger-ink" />,
        warning: <TriangleAlert aria-hidden="true" className="size-5 text-warning-ink" />,
        info: <Info aria-hidden="true" className="size-5 text-info-ink" />,
      }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: TEXTS.ui.close,
        classNames: {
          toast:
            "flex w-(--width) items-start gap-3 rounded-md border border-line bg-surface-raised px-4 py-3 text-body text-fg shadow-md",
          title: "font-semibold text-fg",
          description: "text-small text-fg-muted",
          icon: "mt-0.5",
          closeButton:
            "order-last ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-fg-muted hover:bg-surface-hover hover:text-fg",
          actionButton:
            "rounded-md bg-primary px-3 py-1 text-small font-medium text-on-primary hover:bg-primary-hover",
        },
      }}
      style={{ zIndex: "var(--layer-toast)" }}
    />
  );
}

type ToastOptions = Pick<ExternalToast, "description" | "action" | "duration" | "id">;

export const toast = {
  success: (title: string, options?: ToastOptions) => sonnerToast.success(title, options),
  error: (title: string, options?: ToastOptions) => sonnerToast.error(title, options),
  warning: (title: string, options?: ToastOptions) => sonnerToast.warning(title, options),
  info: (title: string, options?: ToastOptions) => sonnerToast.info(title, options),
};
