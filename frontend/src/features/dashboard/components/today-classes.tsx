import { CalendarX2, Clock } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { APP_ROUTES } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";
import { RegisterClassesButton } from "@/features/logbook/components/register-classes-button";
import { formatTimeRange } from "@/lib/formatters";

import type { DashboardSummary, TodayClass } from "../types/dashboard";

const texts = TEXTS.dashboard.today;

function toRegister(item: TodayClass) {
  return { scheduleId: item.schedule_id, startTime: item.start_time, endTime: item.end_time };
}

/** Clases del horario de hoy: las que ya terminaron se registran en un clic. */
export function TodayClasses({ today }: { today: DashboardSummary["today"] }) {
  const due = today.classes.filter((item) => item.is_due && !item.registered);

  return (
    <Card aria-labelledby="inicio-hoy">
      <CardHeader className="items-center">
        <CardTitle id="inicio-hoy">{texts.title}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="link" size="sm" asChild>
            <Link href={APP_ROUTES.logbook}>{texts.openLogbook}</Link>
          </Button>
          {due.length > 1 ? (
            <RegisterClassesButton
              date={today.date}
              classes={due.map(toRegister)}
              label={texts.registerAll(due.length)}
            />
          ) : null}
        </div>
      </CardHeader>
      {today.classes.length === 0 ? (
        <EmptyState icon={CalendarX2} title={texts.empty} description={texts.emptyHint} />
      ) : (
        <ul className="divide-y divide-line">
          {today.classes.map((item) => (
            <li
              key={item.schedule_id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3"
            >
              <div className="grid min-w-0 gap-0.5">
                <p className="text-label font-semibold text-fg">{item.assignment.subject_name}</p>
                <p className="text-small text-fg-muted">
                  <span className="figures">{formatTimeRange(item.start_time, item.end_time)}</span>
                  {" · "}
                  {item.assignment.career_name}
                </p>
              </div>
              <ClassAction date={today.date} item={item} />
            </li>
          ))}
        </ul>
      )}
      {today.classes.length > 0 && due.length === 0 && today.registered_count > 0 ? (
        <CardContent className="border-t border-line text-small text-fg-muted">
          {texts.allDone}
        </CardContent>
      ) : null}
    </Card>
  );
}

function ClassAction({ date, item }: { date: string; item: TodayClass }) {
  if (item.registered) {
    return <StatusBadge status="session-registered" label={texts.registered} />;
  }
  if (!item.is_due) {
    return (
      <Badge tone="neutral" title={texts.upcomingHint(item.end_time)}>
        <Clock aria-hidden="true" />
        {texts.upcoming}
        <span className="sr-only">. {texts.upcomingHint(item.end_time)}</span>
      </Badge>
    );
  }
  return (
    <RegisterClassesButton
      date={date}
      classes={[toRegister(item)]}
      label={texts.register}
      variant="outline"
      accessibleLabel={TEXTS.logbookActions.registerLabel(
        item.assignment.subject_name,
        formatTimeRange(item.start_time, item.end_time),
      )}
    />
  );
}
