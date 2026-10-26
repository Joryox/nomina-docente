"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { controlHeight, controlSurface } from "./control-styles";
import { useFieldControl } from "./field";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  const controlProps = useFieldControl(props);
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(controlSurface, controlHeight, className)}
      {...controlProps}
    />
  );
}
