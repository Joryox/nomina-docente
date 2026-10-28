"use client";

import {
  CalendarCheck,
  ClipboardList,
  Clock,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Hours } from "@/components/domain/hours";
import { StatusBadge } from "@/components/domain/status-badge";
import { Appear, Stagger, StaggerItem } from "@/components/ui/motion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { API_MAX_PAGE_SIZE, RECENT_PERIODS_COUNT } from "@/constants/query";
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { useAssignments } from "@/features/assignments/hooks/use-assignments";
import { ClassShift } from "@/features/catalogs/components/class-shift";
import { useBusinessRules } from "@/features/catalogs/hooks/use-catalogs";
import { toUserMessage } from "@/lib/api-error";
import type { ApiSchemas } from "@/lib/api-types";
import { addDays } from "@/lib/calendar";
import {
  formatClassContext,
  formatClassLabel,
  formatDayOfPeriod,
  formatFullDate,
  formatPeriodName,
  formatTimeRange,
} from "@/lib/formatters";
import { toPaginationState } from "@/lib/pagination";
import { parsePeriodKey, periodKey, periodOf, recentPeriods } from "@/lib/periods";

import { useDeleteLogbookEntry, useLogbook, useScheduledClasses } from "../hooks/use-logbook";
import type { LogbookEntry } from "../types/logbook";
import { LogbookEntryDialog } from "./logbook-entry-dialog";
import { RegisterClassesButton } from "./register-classes-button";

const texts = SCREENS.logbook;
const ALL = "todas";

type BusinessRules = ApiSchemas["BusinessRulesResponse"];

/** Bitácora: clases programadas de la fecha elegida (hoy por defecto) y sesiones de la quincena. */
export function LogbookPage() {
  const rules = useBusinessRules();

  return (
    <>
      <PageHeader
        title={texts.title}
        description={texts.description}
        actions={
          <LogbookEntryDialog
            trigger={
              <Button variant="outline">
                <Plus aria-hidden="true" />
                {texts.other.open}
              </Button>
            }
          />
        }
      />
      {rules.isError ? (
        <Alert
          tone="danger"
          title={SCREENS.common.loadError}
          announce
          action={
            <Button variant="outline" size="sm" onClick={() => void rules.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(rules.error)}
        </Alert>
      ) : rules.data ? (
        <LogbookContent rules={rules.data} />
      ) : (
        <div className="grid gap-(--section-gap)" aria-busy="true">
          <p className="sr-only">{TEXTS.ui.loading}</p>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
    </>
  );
}

function LogbookContent({ rules }: { rules: BusinessRules }) {
  const [date, setDate] = useState(rules.today);
  const [period, setPeriod] = useState(periodKey(periodOf(rules.today)));
  const periods = recentPeriods(rules.today, RECENT_PERIODS_COUNT);

  const chooseDate = (next: string) => {
    setDate(next);
    // La lista de sesiones acompaña a la fecha elegida.
    setPeriod(periodKey(periodOf(next)));
  };

  return (
    <div className="grid gap-(--section-gap)">
      <div className="flex flex-wrap items-end gap-4">
        <Field
          label={texts.dateLabel}
          hint={texts.dateHint(rules.logbook_max_age_days)}
          className="w-full sm:w-72"
        >
          <DatePicker
            value={date}
            onChange={(value) => value && chooseDate(value)}
            min={addDays(rules.today, -rules.logbook_max_age_days)}
            disableFuture
          />
        </Field>
        {date !== rules.today ? (
          <Button variant="ghost" onClick={() => chooseDate(rules.today)}>
            {texts.today}
          </Button>
        ) : null}
      </div>
      <ScheduledForDate date={date} />
      <SessionsOfPeriod
        period={period}
        periods={periods.map(periodKey)}
        onPeriodChange={setPeriod}
      />
    </div>
  );
}

/** Clases del horario para la fecha, con sus horas precargadas y registro en un clic. */
function ScheduledForDate({ date }: { date: string }) {
  const scheduled = useScheduledClasses(date);
  const classes = scheduled.data?.classes ?? [];
  const due = classes.filter((item) => item.is_due && !item.registered);
  const locked = scheduled.data?.is_locked ?? false;

  return (
    <Card aria-labelledby="bitacora-programadas">
      <CardHeader className="items-center">
        <div>
          <CardTitle id="bitacora-programadas">{texts.scheduled.title}</CardTitle>
          <CardDescription>{texts.scheduled.forDate(formatFullDate(date))}</CardDescription>
        </div>
        {!locked && due.length > 1 ? (
          <RegisterClassesButton
            date={date}
            classes={due.map((item) => ({
              scheduleId: item.schedule_id,
              startTime: item.start_time,
              endTime: item.end_time,
            }))}
            label={texts.scheduled.registerAll(due.length)}
          />
        ) : null}
      </CardHeader>
      {scheduled.isPending ? (
        <div className="grid gap-3 px-5 py-4" aria-busy="true">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      ) : scheduled.isError ? (
        <div className="px-5 py-4">
          <Alert tone="danger">{toUserMessage(scheduled.error)}</Alert>
        </div>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={texts.scheduled.empty}
          description={texts.scheduled.emptyHint}
        />
      ) : (
        <>
          {locked ? (
            <div className="px-5 pt-4">
              <Alert tone="info">{texts.scheduled.locked}</Alert>
            </div>
          ) : null}
          <Stagger as="ul" className="divide-y divide-line">
            {classes.map((item) => (
              <StaggerItem
                as="li"
                key={item.schedule_id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3"
              >
                <div className="grid min-w-0 gap-0.5">
                  <p className="flex flex-wrap items-center gap-2 text-label font-semibold text-fg">
                    {item.assignment.subject_name}
                    <ClassShift startTime={item.start_time} />
                  </p>
                  <p className="text-small text-fg-muted">
                    <span className="figures">
                      {formatTimeRange(item.start_time, item.end_time)}
                    </span>
                    {TEXTS.classes.separator}
                    {formatClassContext(item.assignment.career_name, item.assignment.group)}
                  </p>
                </div>
                {item.registered ? (
                  <Appear>
                    <StatusBadge status="session-registered" label={texts.scheduled.registered} />
                  </Appear>
                ) : locked ? (
                  <StatusBadge status="session-locked" />
                ) : !item.is_due ? (
                  <Badge tone="neutral">
                    <Clock aria-hidden="true" />
                    {texts.scheduled.upcoming}
                    <span className="sr-only">. {texts.scheduled.upcomingHint(item.end_time)}</span>
                  </Badge>
                ) : (
                  <RegisterClassesButton
                    date={date}
                    classes={[
                      {
                        scheduleId: item.schedule_id,
                        startTime: item.start_time,
                        endTime: item.end_time,
                      },
                    ]}
                    label={texts.scheduled.register}
                    variant="outline"
                    accessibleLabel={TEXTS.logbookActions.registerLabel(
                      formatClassLabel(
                        item.assignment.subject_name,
                        item.assignment.career_code,
                        item.assignment.group,
                      ),
                      formatTimeRange(item.start_time, item.end_time),
                    )}
                  />
                )}
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}
    </Card>
  );
}

function SessionsOfPeriod({
  period,
  periods,
  onPeriodChange,
}: {
  period: string;
  periods: string[];
  onPeriodChange: (period: string) => void;
}) {
  const [assignment, setAssignment] = useState(ALL);
  const [page, setPage] = useState(1);
  const selected = parsePeriodKey(period);
  const assignments = useAssignments({ status: "all", page_size: API_MAX_PAGE_SIZE });
  const logbook = useLogbook({
    ...selected,
    assignment_id: assignment === ALL ? undefined : assignment,
    page,
  });
  const options = periods.includes(period) ? periods : [period, ...periods];
  const anyLocked = logbook.data?.items.some((entry) => entry.is_locked) ?? false;

  const columns: DataTableColumn<LogbookEntry>[] = [
    {
      id: "date",
      header: texts.sessions.columns.date,
      sortValue: (entry) => `${entry.session_date} ${entry.start_time}`,
      cell: (entry) => (
        <time dateTime={entry.session_date} className="whitespace-nowrap">
          {formatDayOfPeriod(entry.session_date)}
        </time>
      ),
    },
    {
      id: "class",
      header: texts.sessions.columns.class,
      primary: true,
      sortValue: (entry) => entry.assignment.subject_name,
      cell: (entry) => (
        <div className="grid gap-0.5">
          <span className="font-semibold text-fg">{entry.assignment.subject_name}</span>
          <span className="text-small text-fg-muted">
            {formatClassContext(entry.assignment.career_name, entry.assignment.group)}
          </span>
        </div>
      ),
    },
    {
      id: "time",
      header: texts.sessions.columns.time,
      cell: (entry) => (
        <span className="whitespace-nowrap figures">
          {formatTimeRange(entry.start_time, entry.end_time)}
        </span>
      ),
    },
    {
      id: "hours",
      header: texts.sessions.columns.hours,
      align: "end",
      sortValue: (entry) => entry.minutes,
      cell: (entry) => <Hours value={entry.hours} />,
    },
    {
      id: "status",
      header: texts.sessions.columns.status,
      cell: (entry) => (
        <div className="flex flex-wrap gap-1">
          {entry.is_locked ? (
            <Badge tone="neutral" title={texts.sessions.lockedHint}>
              <Lock aria-hidden="true" />
              {texts.sessions.lockedBadge}
              <span className="sr-only">. {texts.sessions.lockedHint}</span>
            </Badge>
          ) : (
            <StatusBadge status="session-registered" />
          )}
          {entry.matches_schedule ? null : <StatusBadge status="session-off-schedule" />}
        </div>
      ),
    },
    {
      id: "actions",
      header: SCREENS.common.actions,
      align: "end",
      cell: (entry) => (entry.is_locked ? null : <EntryActions entry={entry} />),
    },
  ];

  return (
    <section aria-labelledby="bitacora-sesiones" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <CardTitle id="bitacora-sesiones">{texts.sessions.title}</CardTitle>
          {logbook.data ? (
            <CardDescription>
              {texts.sessions.totalSessions(logbook.data.totals.session_count)}
              {" · "}
              <Hours value={logbook.data.totals.total_hours} />
            </CardDescription>
          ) : null}
        </div>
        <div className="flex w-full flex-wrap gap-4 sm:w-auto">
          <Field label={texts.sessions.periodLabel} className="w-full sm:w-72">
            <Select
              value={period}
              onValueChange={(value) => {
                onPeriodChange(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((key) => {
                  const parsed = parsePeriodKey(key);
                  return parsed ? (
                    <SelectItem key={key} value={key}>
                      {formatPeriodName(parsed)}
                    </SelectItem>
                  ) : null;
                })}
              </SelectContent>
            </Select>
          </Field>
          <Field label={texts.sessions.assignmentFilter} className="w-full sm:w-64">
            <Select
              value={assignment}
              onValueChange={(value) => {
                setAssignment(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{texts.sessions.allAssignments}</SelectItem>
                {(assignments.data?.items ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {formatClassLabel(item.subject.name, item.career.code, item.group)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
      {anyLocked ? <Alert tone="info">{texts.sessions.lockedHint}</Alert> : null}
      {logbook.isError ? (
        <Alert
          tone="danger"
          action={
            <Button variant="outline" size="sm" onClick={() => void logbook.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(logbook.error)}
        </Alert>
      ) : (
        <DataTable
          caption={texts.sessions.caption}
          columns={columns}
          rows={logbook.data?.items ?? []}
          getRowId={(entry) => entry.id}
          loading={logbook.isPending}
          pagination={
            logbook.data && logbook.data.total_pages > 1
              ? { ...toPaginationState(logbook.data), onPageChange: setPage }
              : undefined
          }
          empty={
            assignment === ALL ? (
              <EmptyState
                icon={ClipboardList}
                title={texts.sessions.empty}
                description={texts.sessions.emptyHint}
              />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title={texts.sessions.noMatches}
                description={texts.sessions.noMatchesHint}
              />
            )
          }
        />
      )}
    </section>
  );
}

function EntryActions({ entry }: { entry: LogbookEntry }) {
  const [action, setAction] = useState<"edit" | "delete" | null>(null);
  const remove = useDeleteLogbookEntry();
  const name = formatClassLabel(
    entry.assignment.subject_name,
    entry.assignment.career_code,
    entry.assignment.group,
  );
  const close = (open: boolean) => !open && setAction(null);

  return (
    <>
      {/* No modal: el menú abre diálogos y no debe atrapar el foco al cerrarse. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={SCREENS.common.moreActions(name)}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setAction("edit")}>
            <Pencil aria-hidden="true" />
            {SCREENS.common.edit}
          </DropdownMenuItem>
          <DropdownMenuItem tone="danger" onSelect={() => setAction("delete")}>
            <Trash2 aria-hidden="true" />
            {SCREENS.common.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {action === "edit" ? <LogbookEntryDialog entry={entry} open onOpenChange={close} /> : null}
      {action === "delete" ? (
        <ConfirmDialog
          open
          onOpenChange={close}
          title={texts.remove.title(name, formatFullDate(entry.session_date))}
          description={texts.remove.body}
          confirmLabel={texts.remove.confirm}
          onConfirm={async () => {
            try {
              await remove.mutateAsync(entry.id);
              toast.success(texts.remove.done);
            } catch (error) {
              toast.error(toUserMessage(error));
              throw error;
            }
          }}
        />
      ) : null}
    </>
  );
}
