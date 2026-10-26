import {
  CalendarClock,
  CircleCheck,
  CircleDashed,
  CircleOff,
  Clock,
  FileCheck2,
  Lock,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import { TEXTS } from "@/constants/texts";
import type { ApiSchemas } from "@/lib/api-types";

import { Badge, type BadgeTone } from "@/components/ui/badge";

type PeriodStatus = ApiSchemas["PeriodStatus"];

export type StatusKind =
  | "session-registered"
  | "session-pending"
  | "session-locked"
  | "session-off-schedule"
  | `period-${PeriodStatus}`
  | "active"
  | "inactive"
  | "warning";

const texts = TEXTS.status;

const STATUS: Record<StatusKind, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  "session-registered": { label: texts.sessionRegistered, tone: "success", icon: CircleCheck },
  "session-pending": { label: texts.sessionPending, tone: "warning", icon: CircleDashed },
  "session-locked": { label: texts.sessionLocked, tone: "neutral", icon: Lock },
  "session-off-schedule": { label: texts.sessionOffSchedule, tone: "warning", icon: Clock },
  "period-future": { label: texts.periodFuture, tone: "neutral", icon: CalendarClock },
  "period-open": { label: texts.periodOpen, tone: "info", icon: Clock },
  "period-closed": { label: texts.periodClosed, tone: "primary", icon: CircleCheck },
  "period-issued": { label: texts.periodIssued, tone: "success", icon: FileCheck2 },
  active: { label: texts.active, tone: "success", icon: CircleCheck },
  inactive: { label: texts.inactive, tone: "neutral", icon: CircleOff },
  warning: { label: texts.warning, tone: "warning", icon: TriangleAlert },
};

/**
 * Estado de una sesión, quincena o registro con el mismo color, icono y texto en todo el
 * sistema. Un estado nuevo se agrega aquí, no en cada pantalla.
 */
export function StatusBadge({ status, label }: { status: StatusKind; label?: string }) {
  const { label: defaultLabel, tone, icon: Icon } = STATUS[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden="true" />
      {label ?? defaultLabel}
    </Badge>
  );
}
