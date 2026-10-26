"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";

import { cn } from "@/lib/utils";

import { buttonVariants } from "./button";

const MONDAY = 1;

/** Calendario mensual en español de México; la semana empieza en lunes. */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={es}
      weekStartsOn={MONDAY}
      showOutsideDays={showOutsideDays}
      className={cn("text-body", className)}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "grid gap-3",
        month_caption: "flex h-(--control-height-sm) items-center px-10 first-letter:uppercase",
        caption_label: "text-label font-semibold text-fg first-letter:uppercase",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon-sm" })),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon-sm" })),
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "w-(--control-height-md) pb-1 text-center text-overline text-fg-muted uppercase",
        week: "flex",
        day: "p-0 text-center",
        day_button: cn(
          "inline-flex size-(--control-height-md) items-center justify-center rounded-sm text-body text-fg figures",
          "hover:bg-surface-hover",
          "aria-selected:bg-primary aria-selected:text-on-primary aria-selected:hover:bg-primary-hover",
        ),
        today:
          "font-semibold [&>button]:underline [&>button]:decoration-2 [&>button]:underline-offset-4",
        outside: "[&>button]:text-fg-muted",
        disabled:
          "[&>button]:cursor-not-allowed [&>button]:text-fg-disabled [&>button]:line-through [&>button]:hover:bg-transparent",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft aria-hidden="true" className="size-4" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
