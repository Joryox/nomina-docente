import { Moon, Sun } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { TEXTS } from "@/constants/texts";
import { cn } from "@/lib/utils";
import type { Shift } from "@/lib/shifts";

const ICONS = { morning: Sun, afternoon: Moon } as const;

/** Turno calculado por el sistema a partir de la hora de entrada (RN-43). */
export function ShiftBadge({ shift, className }: { shift: Shift; className?: string }) {
  const Icon = ICONS[shift];
  const label = TEXTS.classes.shifts[shift];
  return (
    <Badge
      tone="neutral"
      className={cn("justify-self-start", className)}
      title={TEXTS.classes.shiftLabel(label)}
    >
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
