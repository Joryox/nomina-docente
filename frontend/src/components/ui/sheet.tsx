"use client";

import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { TEXTS } from "@/constants/texts";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { overlayClasses } from "./dialog";

/** Panel que se desliza desde un costado (navegación en celular). */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;
export const SheetDescription = SheetPrimitive.Description;

export function SheetContent({
  className,
  children,
  closeLabel = TEXTS.ui.close,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & { closeLabel?: string }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className={overlayClasses} />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-y-0 left-0 z-(--layer-modal) flex w-(--sidebar-width) max-w-(--sheet-max-width) flex-col border-r border-line bg-surface text-fg shadow-md outline-none",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left",
          "duration-(--duration-slow) ease-standard",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3"
            aria-label={closeLabel}
          >
            <X aria-hidden="true" />
          </Button>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
