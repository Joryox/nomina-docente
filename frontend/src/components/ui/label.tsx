"use client";

import { Label as LabelPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "inline-flex items-baseline gap-1 text-label text-fg select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:text-fg-disabled",
        className,
      )}
      {...props}
    />
  );
}
