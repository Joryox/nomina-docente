"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { ToggleGroup } from "radix-ui";

import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { THEME_PREFERENCES, type ThemePreference } from "@/constants/preferences";
import { TEXTS } from "@/constants/texts";
import { setThemePreference, useThemePreference } from "@/lib/theme/preferences-store";
import { cn } from "@/lib/utils";

const ICONS: Record<ThemePreference, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };
const texts = TEXTS.theme;

function isThemePreference(value: string): value is ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value);
}

/**
 * Selector segmentado de tema (acceso, páginas públicas). La elección se recuerda. Es un
 * grupo de botones excluyentes (sin campo de formulario oculto, que no hace falta aquí).
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const preference = useThemePreference();
  return (
    <ToggleGroup.Root
      type="single"
      aria-label={texts.label}
      value={preference}
      onValueChange={(value) => isThemePreference(value) && setThemePreference(value)}
      orientation="horizontal"
      className={cn("inline-flex rounded-md border border-line bg-surface p-0.5", className)}
    >
      {THEME_PREFERENCES.map((option) => {
        const Icon = ICONS[option];
        return (
          <ToggleGroup.Item
            key={option}
            value={option}
            aria-label={texts.options[option]}
            title={texts.options[option]}
            className={cn(
              "inline-flex size-(--control-height-sm) items-center justify-center rounded-sm text-fg-muted",
              "transition-colors duration-(--duration-fast) hover:text-fg",
              "data-[state=on]:bg-primary-soft data-[state=on]:text-primary-ink",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </ToggleGroup.Item>
        );
      })}
    </ToggleGroup.Root>
  );
}

/** Las mismas opciones dentro de un DropdownMenu (menú de la cuenta). */
export function ThemeMenuOptions() {
  const preference = useThemePreference();
  return (
    <DropdownMenuRadioGroup
      value={preference}
      onValueChange={(value) => isThemePreference(value) && setThemePreference(value)}
    >
      {THEME_PREFERENCES.map((option) => {
        const Icon = ICONS[option];
        return (
          <DropdownMenuRadioItem key={option} value={option}>
            <Icon aria-hidden="true" />
            {texts.options[option]}
          </DropdownMenuRadioItem>
        );
      })}
    </DropdownMenuRadioGroup>
  );
}
