"use client";

import { Check } from "lucide-react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Menú de acciones secundarias (menú de la cuenta, «más acciones» de una fila). */
export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuGroup = MenuPrimitive.Group;
export const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup;

export function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-(--layer-popover) min-w-56 rounded-md border border-line bg-surface-raised p-1 text-fg shadow-sm",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

const itemClasses = [
  "relative flex min-h-(--control-height-sm) cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-body outline-none select-none",
  "data-[highlighted]:bg-surface-hover",
  "data-[disabled]:cursor-not-allowed data-[disabled]:text-fg-disabled",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted",
].join(" ");

export function DropdownMenuItem({
  className,
  tone = "default",
  ...props
}: ComponentProps<typeof MenuPrimitive.Item> & { tone?: "default" | "danger" }) {
  return (
    <MenuPrimitive.Item
      className={cn(
        itemClasses,
        tone === "danger" && "text-danger-ink [&_svg]:text-danger-ink",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cn(itemClasses, "pl-8", className)} {...props}>
      <MenuPrimitive.ItemIndicator className="absolute left-2 inline-flex">
        <Check aria-hidden="true" className="text-primary-ink!" />
      </MenuPrimitive.ItemIndicator>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      className={cn("px-2 pt-2 pb-1 text-overline text-fg-muted uppercase", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator className={cn("-mx-1 my-1 h-px bg-line", className)} {...props} />
  );
}
