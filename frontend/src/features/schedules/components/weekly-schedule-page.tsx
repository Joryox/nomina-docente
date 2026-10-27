"use client";

import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Hours } from "@/components/domain/hours";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { API_MAX_PAGE_SIZE } from "@/constants/query";
import { APP_ROUTES } from "@/constants/routes";
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { MINUTES_PER_HOUR } from "@/constants/validation";
import { useAssignments } from "@/features/assignments/hooks/use-assignments";
import { toUserMessage } from "@/lib/api-error";
import type { Weekday } from "@/lib/api-types";
import { minutesOfDay } from "@/lib/calendar";
import { formatTimeRange, formatWeekday } from "@/lib/formatters";

import { useDeleteSchedule, useWeeklySchedule } from "../hooks/use-schedules";
import type { WeeklySchedule } from "../types/schedules";
import { CreateScheduleDialog, ScheduleFormDialog } from "./schedule-form-dialog";

const texts = SCREENS.schedule;
const SUNDAY = 7;
const WORK_WEEK = [1, 2, 3, 4, 5, 6] as const;

type WeeklyDay = WeeklySchedule["days"][number];
type WeeklyClass = WeeklyDay["classes"][number];

/** Lunes a sábado siempre; el domingo solo si tiene clases. */
function visibleDays(schedule: WeeklySchedule): WeeklyDay[] {
  return schedule.days.filter(
    (day) =>
      (WORK_WEEK as readonly number[]).includes(day.weekday) ||
      (day.weekday === SUNDAY && day.classes.length > 0),
  );
}

/** Horas enteras que cubre la vista: de la primera entrada a la última salida. */
function hourRange(days: readonly WeeklyDay[]): { first: number; last: number } {
  const classes = days.flatMap((day) => day.classes);
  const first = Math.min(...classes.map((item) => minutesOfDay(item.start_time)));
  const last = Math.max(...classes.map((item) => minutesOfDay(item.end_time)));
  return {
    first: Math.floor(first / MINUTES_PER_HOUR),
    last: Math.ceil(last / MINUTES_PER_HOUR),
  };
}

/** Horario semanal: bloques por clase en escritorio y lista por día en celular. */
export function WeeklySchedulePage() {
  const schedule = useWeeklySchedule();
  const assignments = useAssignments({ status: "active", page_size: API_MAX_PAGE_SIZE });
  const [selected, setSelected] = useState<{ day: number; item: WeeklyClass } | null>(null);
  const hasClasses = (schedule.data?.total_minutes ?? 0) > 0;
  const noAssignments = assignments.data?.total_items === 0;

  return (
    <>
      <PageHeader
        title={texts.title}
        description={texts.description}
        meta={
          schedule.data && hasClasses ? (
            <span className="text-label text-fg-muted">
              <Hours value={schedule.data.total_hours} className="text-fg" /> {texts.weeklyTotal}
            </span>
          ) : undefined
        }
        actions={noAssignments ? undefined : <CreateScheduleDialog size="md" />}
      />
      {schedule.isError ? (
        <Alert
          tone="danger"
          title={SCREENS.common.loadError}
          announce
          action={
            <Button variant="outline" size="sm" onClick={() => void schedule.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(schedule.error)}
        </Alert>
      ) : schedule.isPending ? (
        <div className="grid gap-3" aria-busy="true">
          <p className="sr-only">{TEXTS.ui.loading}</p>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : !hasClasses ? (
        <Card>
          {noAssignments ? (
            <EmptyState
              icon={CalendarDays}
              title={texts.emptyNoClasses}
              description={texts.emptyNoClassesHint}
              action={
                <Button asChild>
                  <Link href={APP_ROUTES.assignments}>{texts.goToClasses}</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={CalendarDays}
              title={texts.empty}
              description={texts.emptyHint}
              action={<CreateScheduleDialog size="md" />}
            />
          )}
        </Card>
      ) : (
        <>
          <WeekGrid
            days={visibleDays(schedule.data)}
            onSelect={(day, item) => setSelected({ day, item })}
          />
          <DayList
            days={visibleDays(schedule.data)}
            onSelect={(day, item) => setSelected({ day, item })}
          />
        </>
      )}
      {selected ? (
        <ClassDialog
          weekday={selected.day}
          item={selected.item}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

interface ViewProps {
  days: WeeklyDay[];
  onSelect: (weekday: number, item: WeeklyClass) => void;
}

function blockLabel(day: number, item: WeeklyClass): string {
  return texts.blockLabel(
    item.assignment.subject_name,
    item.assignment.career_name,
    formatWeekday(day as Weekday),
    formatTimeRange(item.start_time, item.end_time),
  );
}

/** Cuadrícula de escritorio: una columna por día y bloques a la altura de su horario. */
function WeekGrid({ days, onSelect }: ViewProps) {
  const { first, last } = hourRange(days);
  const hours = Array.from({ length: last - first }, (_, index) => first + index);
  const hourOffset = (time: string) => minutesOfDay(time) / MINUTES_PER_HOUR - first;

  return (
    <Card className="hidden overflow-x-auto md:block">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">{texts.caption}</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="w-(--schedule-axis-width)">
              <span className="sr-only">{TEXTS.ui.timeRange.start}</span>
            </th>
            {days.map((day) => (
              <th
                key={day.weekday}
                scope="col"
                className="border-l border-line px-2 py-3 text-left text-overline text-fg-muted uppercase"
              >
                {formatWeekday(day.weekday)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="relative align-top">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-(--schedule-hour-height) pr-2 text-right text-small text-fg-muted figures"
                >
                  {`${String(hour).padStart(2, "0")}:00`}
                </div>
              ))}
            </td>
            {days.map((day) => (
              <td key={day.weekday} className="relative border-l border-line align-top">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    aria-hidden="true"
                    className="h-(--schedule-hour-height) border-t border-line first:border-t-0"
                  />
                ))}
                {day.classes.length === 0 ? (
                  <span className="sr-only">{texts.dayEmpty}</span>
                ) : null}
                {day.classes.map((item) => (
                  <button
                    key={item.schedule_id}
                    type="button"
                    aria-label={blockLabel(day.weekday, item)}
                    onClick={() => onSelect(day.weekday, item)}
                    className="absolute inset-x-1 grid content-start overflow-hidden rounded-md border border-l-4 border-primary-ink border-y-line border-r-line bg-primary-soft px-2 py-0.5 text-left transition-colors duration-(--duration-fast) hover:bg-primary-soft-hover"
                    style={{
                      top: `calc(var(--schedule-hour-height) * ${hourOffset(item.start_time)})`,
                      height: `calc(var(--schedule-hour-height) * ${
                        item.duration_minutes / MINUTES_PER_HOUR
                      })`,
                    }}
                  >
                    <span className="truncate text-small font-semibold text-primary-ink">
                      {item.assignment.subject_name}
                    </span>
                    <span className="truncate text-small text-fg figures">
                      {formatTimeRange(item.start_time, item.end_time)}
                    </span>
                    {item.duration_minutes >= MINUTES_PER_HOUR ? (
                      <span className="truncate text-small text-fg-muted">
                        {item.assignment.career_code}
                      </span>
                    ) : null}
                  </button>
                ))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

/** Celular: un bloque por día con sus clases en orden. */
function DayList({ days, onSelect }: ViewProps) {
  return (
    <div className="grid gap-4 md:hidden">
      {days.map((day) => (
        <Card key={day.weekday} aria-labelledby={`dia-${day.weekday}`}>
          <CardHeader className="items-center py-3">
            <CardTitle id={`dia-${day.weekday}`} className="capitalize">
              {formatWeekday(day.weekday)}
            </CardTitle>
          </CardHeader>
          {day.classes.length === 0 ? (
            <p className="px-5 py-3 text-body text-fg-muted">{texts.dayEmpty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {day.classes.map((item) => (
                <li key={item.schedule_id}>
                  <button
                    type="button"
                    aria-label={blockLabel(day.weekday, item)}
                    onClick={() => onSelect(day.weekday, item)}
                    className="grid w-full gap-0.5 px-5 py-3 text-left hover:bg-surface-hover"
                  >
                    <span className="text-label font-semibold text-fg">
                      {item.assignment.subject_name}
                    </span>
                    <span className="text-small text-fg-muted">
                      <span className="figures">
                        {formatTimeRange(item.start_time, item.end_time)}
                      </span>
                      {" · "}
                      {item.assignment.career_name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}

/** Detalle de un bloque: editar o eliminar ese horario. */
function ClassDialog({
  weekday,
  item,
  onClose,
}: {
  weekday: number;
  item: WeeklyClass;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const remove = useDeleteSchedule();
  const when = `${formatWeekday(weekday as Weekday)} ${formatTimeRange(item.start_time, item.end_time)}`;
  const close = (open: boolean) => !open && onClose();

  if (mode === "edit") {
    return (
      <ScheduleFormDialog
        open
        onOpenChange={close}
        schedule={{
          id: item.schedule_id,
          assignmentId: item.assignment.id,
          assignmentLabel: item.assignment.subject_name,
          weekday,
          startTime: item.start_time,
          endTime: item.end_time,
        }}
      />
    );
  }
  if (mode === "delete") {
    return (
      <ConfirmDialog
        open
        onOpenChange={close}
        title={texts.remove.title(item.assignment.subject_name, when)}
        description={texts.remove.body}
        confirmLabel={texts.remove.confirm}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(item.schedule_id);
            toast.success(texts.remove.done);
          } catch (error) {
            toast.error(toUserMessage(error));
            throw error;
          }
        }}
      />
    );
  }
  return (
    <Dialog open onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.assignment.subject_name}</DialogTitle>
          <DialogDescription>{item.assignment.career_name}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-body text-fg capitalize figures">{when}</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMode("delete")}>
            <Trash2 aria-hidden="true" />
            {texts.remove.action}
          </Button>
          <Button onClick={() => setMode("edit")}>
            <Pencil aria-hidden="true" />
            {texts.form.editTitle}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
