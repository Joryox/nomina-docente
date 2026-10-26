"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Vistas alternas del mismo contenido (p. ej., lista y semana). No para pasos de un proceso. */
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex items-end gap-1 overflow-x-auto border-b border-line", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "-mb-px inline-flex h-(--control-height-md) items-center gap-2 border-b-2 border-transparent px-3 text-label whitespace-nowrap text-fg-muted",
        "transition-colors duration-(--duration-fast) hover:text-fg",
        "data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-fg",
        "disabled:cursor-not-allowed disabled:text-fg-disabled",
        "[&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("pt-4", className)} {...props} />;
}
