"use client";

import { Hours } from "@/components/domain/hours";
import { Money } from "@/components/domain/money";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { StatCard } from "@/components/ui/stat-card";
import { TEXTS } from "@/constants/texts";
import { useAnimatedDecimal } from "@/lib/use-animated-decimal";

import type { DashboardSummary } from "../types/dashboard";

const texts = TEXTS.dashboard.stats;

/** Indicadores de la quincena en curso; el monto estimado es el principal. */
export function DashboardStats({ summary }: { summary: DashboardSummary }) {
  const current = summary.current_period;
  const pending = summary.pending_sessions.count;
  // Al registrar una clase, las cifras recorren el cambio en lugar de saltar.
  const amount = useAnimatedDecimal(current.estimated_amount);
  const hours = useAnimatedDecimal(current.total_hours);
  const pendingShown = useAnimatedDecimal(String(pending));
  return (
    <Stagger
      as="section"
      aria-label={TEXTS.dashboard.currentPeriod}
      className="grid gap-4 md:grid-cols-3"
    >
      <StaggerItem className="grid">
        <StatCard
          emphasis
          label={texts.amount}
          value={<Money amount={amount} />}
          description={texts.amountDescription}
        />
      </StaggerItem>
      <StaggerItem className="grid">
        <StatCard
          label={texts.hours}
          value={<Hours value={hours} />}
          description={texts.hoursDescription(current.session_count)}
        />
      </StaggerItem>
      <StaggerItem className="grid">
        <StatCard
          label={texts.pending}
          value={pendingShown}
          description={texts.pendingDescription(pending)}
        />
      </StaggerItem>
    </Stagger>
  );
}
