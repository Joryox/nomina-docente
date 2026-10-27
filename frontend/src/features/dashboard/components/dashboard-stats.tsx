import { Hours } from "@/components/domain/hours";
import { Money } from "@/components/domain/money";
import { StatCard } from "@/components/ui/stat-card";
import { TEXTS } from "@/constants/texts";

import type { DashboardSummary } from "../types/dashboard";

const texts = TEXTS.dashboard.stats;

/** Indicadores de la quincena en curso; el monto estimado es el principal. */
export function DashboardStats({ summary }: { summary: DashboardSummary }) {
  const current = summary.current_period;
  const pending = summary.pending_sessions.count;
  return (
    <section aria-label={TEXTS.dashboard.currentPeriod} className="grid gap-4 md:grid-cols-3">
      <StatCard
        emphasis
        label={texts.amount}
        value={<Money amount={current.estimated_amount} />}
        description={texts.amountDescription}
      />
      <StatCard
        label={texts.hours}
        value={<Hours value={current.total_hours} />}
        description={texts.hoursDescription(current.session_count)}
      />
      <StatCard
        label={texts.pending}
        value={pending}
        description={texts.pendingDescription(pending)}
      />
    </section>
  );
}
