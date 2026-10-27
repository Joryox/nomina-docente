"use client";

import { ListChecks } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TEXTS } from "@/constants/texts";
import { RegisterClassesButton } from "@/features/logbook/components/register-classes-button";
import { IssueReceiptButton } from "@/features/payroll/components/issue-receipt-button";
import { formatFullDate, formatPeriodName, formatTimeRange } from "@/lib/formatters";

import type { DashboardSummary, PendingClass } from "../types/dashboard";

const texts = TEXTS.dashboard;

/** Avisos con acción: quincenas terminadas sin recibo y clases sin registrar. */
export function DashboardAlerts({ summary }: { summary: DashboardSummary }) {
  const pending = summary.pending_sessions;
  if (summary.unissued_periods.length === 0 && pending.count === 0) {
    return null;
  }
  return (
    <section aria-label={texts.alerts} className="grid gap-3">
      {summary.unissued_periods.map((period) => (
        <Alert
          key={`${period.year}-${period.month}-${period.fortnight}`}
          tone="info"
          title={texts.unissued.title(formatPeriodName(period))}
          action={
            <IssueReceiptButton
              period={{ year: period.year, month: period.month, fortnight: period.fortnight }}
            />
          }
        >
          {texts.unissued.body}
        </Alert>
      ))}
      {pending.count > 0 ? (
        <Alert
          tone="warning"
          title={texts.pending.title(pending.count)}
          action={<PendingClassesDialog pending={pending} />}
        >
          {texts.pending.body}
        </Alert>
      ) : null}
    </section>
  );
}

function PendingClassesDialog({ pending }: { pending: DashboardSummary["pending_sessions"] }) {
  const hidden = pending.count - pending.items.length;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ListChecks aria-hidden="true" />
          {texts.pending.show}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{texts.pending.dialogTitle}</DialogTitle>
          <DialogDescription>{texts.pending.dialogDescription}</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-3">
          {pending.items.length === 0 ? (
            <p className="text-body text-fg-muted">{texts.stats.pendingDescription(0)}</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {pending.items.map((item) => (
                <PendingRow key={`${item.date}-${item.schedule_id}`} item={item} />
              ))}
            </ul>
          )}
          {hidden > 0 ? (
            <p className="text-small text-fg-muted">{texts.pending.more(hidden)}</p>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function PendingRow({ item }: { item: PendingClass }) {
  const range = formatTimeRange(item.start_time, item.end_time);
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5">
      <div className="grid min-w-0 gap-0.5">
        <p className="text-label font-semibold text-fg">{item.assignment.subject_name}</p>
        <p className="text-small text-fg-muted">
          <time dateTime={item.date}>{formatFullDate(item.date)}</time>
          {" · "}
          <span className="figures">{range}</span>
          {" · "}
          {item.assignment.career_code}
        </p>
      </div>
      <RegisterClassesButton
        date={item.date}
        classes={[
          { scheduleId: item.schedule_id, startTime: item.start_time, endTime: item.end_time },
        ]}
        label={texts.today.register}
        variant="outline"
        accessibleLabel={TEXTS.logbookActions.registerLabel(
          item.assignment.subject_name,
          `${formatFullDate(item.date)}, ${range}`,
        )}
      />
    </li>
  );
}
