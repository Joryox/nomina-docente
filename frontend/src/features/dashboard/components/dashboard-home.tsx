"use client";

import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/domain/status-badge";
import { PeriodLabel } from "@/components/domain/period-label";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TEXTS } from "@/constants/texts";
import { useSession } from "@/features/auth/hooks/use-session";
import { toUserMessage } from "@/lib/api-error";
import { currentHour } from "@/lib/calendar";
import { formatFullDate } from "@/lib/formatters";

import { useDashboardSummary } from "../hooks/use-dashboard";
import type { DashboardSummary } from "../types/dashboard";
import { DashboardAlerts } from "./dashboard-alerts";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DashboardStats } from "./dashboard-stats";
import { LatestReceipts } from "./latest-receipts";
import { needsSetup, SetupGuide } from "./setup-guide";
import { TodayClasses } from "./today-classes";

const texts = TEXTS.dashboard;
const AFTERNOON_FROM_HOUR = 12;
const EVENING_FROM_HOUR = 19;

function greeting(name: string | undefined): string {
  if (!name) {
    return texts.greeting.fallback;
  }
  const hour = currentHour();
  if (hour < AFTERNOON_FROM_HOUR) {
    return texts.greeting.morning(name);
  }
  return hour < EVENING_FROM_HOUR ? texts.greeting.afternoon(name) : texts.greeting.evening(name);
}

/** Inicio del panel: saludo, quincena actual, clases de hoy, avisos y últimos recibos. */
export function DashboardHome() {
  const session = useSession();
  const summary = useDashboardSummary();
  const firstName = session.data?.teacher?.first_names.split(" ")[0];

  return (
    <>
      <PageHeader
        title={greeting(firstName)}
        description={summary.data ? formatFullDate(summary.data.today.date) : undefined}
        meta={summary.data ? <PeriodMeta summary={summary.data} /> : undefined}
      />
      {summary.isPending ? (
        <DashboardSkeleton />
      ) : summary.isError ? (
        <Alert
          tone="danger"
          title={texts.loadError}
          announce
          action={
            <Button variant="outline" size="sm" onClick={() => void summary.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(summary.error)}
        </Alert>
      ) : needsSetup(summary.data.setup) ? (
        <SetupGuide setup={summary.data.setup} />
      ) : (
        <div className="grid gap-(--section-gap)">
          <DashboardAlerts summary={summary.data} />
          <DashboardStats summary={summary.data} />
          <div className="grid items-start gap-(--section-gap) xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <TodayClasses today={summary.data.today} />
            <LatestReceipts receipts={summary.data.latest_receipts} />
          </div>
        </div>
      )}
    </>
  );
}

function PeriodMeta({ summary }: { summary: DashboardSummary }) {
  const current = summary.current_period;
  return (
    <>
      <span className="text-small text-fg-muted">{texts.currentPeriod}:</span>
      <PeriodLabel period={current.period} withRange className="text-label text-fg" />
      <StatusBadge status={`period-${current.status}`} />
    </>
  );
}
