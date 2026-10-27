"use client";

import {
  CalendarPlus,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  PowerOff,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Hours } from "@/components/domain/hours";
import { Money } from "@/components/domain/money";
import { StatusBadge } from "@/components/domain/status-badge";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { API_MAX_PAGE_SIZE } from "@/constants/query";
import { APP_ROUTES } from "@/constants/routes";
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { useCareers } from "@/features/catalogs/hooks/use-catalogs";
import { ScheduleFormDialog } from "@/features/schedules/components/schedule-form-dialog";
import { useSubjects } from "@/features/subjects/hooks/use-subjects";
import { toUserMessage } from "@/lib/api-error";
import type { ApiSchemas } from "@/lib/api-types";
import { formatLongDate, formatTimeRange, formatWeekdayShort } from "@/lib/formatters";
import { compareText } from "@/lib/search";

import {
  useAssignments,
  useDeactivateAssignment,
  useDeleteAssignment,
  useReactivateAssignment,
} from "../hooks/use-assignments";
import type { Assignment } from "../types/assignments";
import { AssignmentFormDialog } from "./assignment-form-dialog";

const texts = SCREENS.assignments;
const common = SCREENS.common;
type StatusFilter = ApiSchemas["StatusFilter"];
const STATUS_OPTIONS: readonly StatusFilter[] = ["active", "inactive", "all"];
const ALL_CAREERS = "todas";

function className(assignment: Assignment): string {
  return `${assignment.subject.name} – ${assignment.career.code}`;
}

/** Agrupa las clases por carrera, en orden alfabético de carrera y de materia. */
function byCareer(assignments: readonly Assignment[]) {
  const groups = new Map<string, { name: string; items: Assignment[] }>();
  for (const assignment of assignments) {
    const group = groups.get(assignment.career.code) ?? {
      name: assignment.career.name,
      items: [],
    };
    group.items.push(assignment);
    groups.set(assignment.career.code, group);
  }
  return [...groups.entries()]
    .map(([code, group]) => ({
      code,
      name: group.name,
      items: group.items.sort((a, b) => compareText(a.subject.name, b.subject.name)),
    }))
    .sort((a, b) => compareText(a.name, b.name));
}

/** Mis clases: materia + carrera + tarifa, agrupadas por carrera, con sus horarios. */
export function AssignmentsPage() {
  const [status, setStatus] = useState<StatusFilter>("active");
  const [career, setCareer] = useState(ALL_CAREERS);
  const assignments = useAssignments({
    status,
    career_code: career === ALL_CAREERS ? undefined : career,
    page_size: API_MAX_PAGE_SIZE,
  });
  const careers = useCareers();
  const subjects = useSubjects({ status: "active", page_size: 1 });
  const groups = byCareer(assignments.data?.items ?? []);
  const filtered = status !== "active" || career !== ALL_CAREERS;
  const noSubjects = subjects.data?.total_items === 0;

  const addButton = (
    <AssignmentFormDialog
      trigger={
        <Button>
          <Plus aria-hidden="true" />
          {texts.add}
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader title={texts.title} description={texts.description} actions={addButton} />
      <div className="mb-(--section-gap) flex flex-wrap items-end gap-4">
        <Field label={texts.careerFilter} className="w-full sm:w-80">
          <Select value={career} onValueChange={setCareer}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CAREERS}>{texts.allCareers}</SelectItem>
              {(careers.data ?? []).map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={common.status.label} className="w-full sm:w-48">
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {common.status[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {assignments.isError ? (
        <Alert
          tone="danger"
          title={common.loadError}
          announce
          action={
            <Button variant="outline" size="sm" onClick={() => void assignments.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(assignments.error)}
        </Alert>
      ) : assignments.isPending ? (
        <AssignmentsSkeleton />
      ) : groups.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState icon={Layers} title={texts.noMatches} description={texts.noMatchesHint} />
          ) : noSubjects ? (
            <EmptyState
              icon={Layers}
              title={texts.emptyNoSubjects}
              description={texts.emptyNoSubjectsHint}
              action={
                <Button asChild>
                  <Link href={APP_ROUTES.subjects}>{texts.goToSubjects}</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Layers}
              title={texts.empty}
              description={texts.emptyHint}
              action={addButton}
            />
          )}
        </Card>
      ) : (
        <Stagger className="grid gap-(--section-gap)">
          {groups.map((group) => (
            <StaggerItem key={group.code}>
              <Card aria-labelledby={`carrera-${group.code}`}>
                <CardHeader className="items-center">
                  <CardTitle id={`carrera-${group.code}`}>{group.name}</CardTitle>
                  <Badge tone="neutral">{group.code}</Badge>
                </CardHeader>
                <ul className="divide-y divide-line">
                  {group.items.map((assignment) => (
                    <AssignmentRow key={assignment.id} assignment={assignment} />
                  ))}
                </ul>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </>
  );
}

function AssignmentRow({ assignment }: { assignment: Assignment }) {
  return (
    <li className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto] md:items-start">
      <div className="grid min-w-0 gap-1">
        <p className="text-label font-semibold text-fg">{assignment.subject.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={assignment.is_active ? "active" : "inactive"} />
          {assignment.has_logbook ? <Badge tone="neutral">{texts.hasLogbook}</Badge> : null}
        </div>
        {assignment.active_until ? (
          <p className="text-small text-fg-muted">
            {texts.inactiveSince(formatLongDate(assignment.active_until))}
          </p>
        ) : null}
      </div>
      <div className="grid gap-0.5">
        <p className="text-small text-fg-muted">{texts.rate}</p>
        <Money amount={assignment.hourly_rate.amount} className="text-label font-semibold" />
      </div>
      <div className="grid gap-1">
        <p className="text-small text-fg-muted">{texts.schedules}</p>
        {assignment.schedules.length === 0 ? (
          <p className="text-body text-fg-muted">{texts.noSchedules}</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-1.5">
              {[...assignment.schedules]
                .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time))
                .map((schedule) => (
                  <li key={schedule.id}>
                    <Badge tone="primary" className="figures">
                      <span className="capitalize">{formatWeekdayShort(schedule.weekday)}</span>{" "}
                      {formatTimeRange(schedule.start_time, schedule.end_time)}
                    </Badge>
                  </li>
                ))}
            </ul>
            <p className="text-small text-fg-muted">
              {texts.weekly}
              <Hours value={assignment.weekly_hours} />
            </p>
          </>
        )}
      </div>
      <div className="justify-self-start md:justify-self-end">
        <AssignmentActions assignment={assignment} />
      </div>
    </li>
  );
}

type Action = "edit" | "schedule" | "deactivate" | "delete" | null;

function AssignmentActions({ assignment }: { assignment: Assignment }) {
  const [action, setAction] = useState<Action>(null);
  const reactivate = useReactivateAssignment();
  const deactivate = useDeactivateAssignment();
  const remove = useDeleteAssignment();
  const name = className(assignment);
  const close = (open: boolean) => !open && setAction(null);

  const run = async (mutation: () => Promise<unknown>, message: string) => {
    try {
      await mutation();
      toast.success(message);
    } catch (error) {
      toast.error(toUserMessage(error));
      throw error;
    }
  };

  return (
    <>
      {/* No modal: el menú abre diálogos y no debe atrapar el foco al cerrarse. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label={common.moreActions(name)}>
            {common.actions}
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {assignment.is_active ? (
            <>
              <DropdownMenuItem onSelect={() => setAction("edit")}>
                <Pencil aria-hidden="true" />
                {common.edit}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAction("schedule")}>
                <CalendarPlus aria-hidden="true" />
                {texts.addSchedule}
              </DropdownMenuItem>
              <DropdownMenuItem tone="danger" onSelect={() => setAction("deactivate")}>
                <PowerOff aria-hidden="true" />
                {common.deactivate}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              disabled={reactivate.isPending}
              onSelect={() =>
                void run(() => reactivate.mutateAsync(assignment.id), texts.reactivated).catch(
                  () => undefined,
                )
              }
            >
              <RotateCcw aria-hidden="true" />
              {common.reactivate}
            </DropdownMenuItem>
          )}
          {assignment.has_logbook ? null : (
            <DropdownMenuItem tone="danger" onSelect={() => setAction("delete")}>
              <Trash2 aria-hidden="true" />
              {common.delete}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {action === "edit" ? (
        <AssignmentFormDialog assignment={assignment} open onOpenChange={close} />
      ) : null}
      {action === "schedule" ? (
        <ScheduleFormDialog assignmentId={assignment.id} open onOpenChange={close} />
      ) : null}
      {action === "deactivate" ? (
        <ConfirmDialog
          open
          onOpenChange={close}
          title={texts.deactivate.title(name)}
          description={texts.deactivate.body}
          consequences={texts.deactivate.consequences}
          confirmLabel={texts.deactivate.confirm}
          irreversible={false}
          onConfirm={() => run(() => deactivate.mutateAsync(assignment.id), texts.deactivate.done)}
        />
      ) : null}
      {action === "delete" ? (
        <ConfirmDialog
          open
          onOpenChange={close}
          title={texts.remove.title(name)}
          description={texts.remove.body}
          consequences={texts.remove.consequences}
          confirmLabel={texts.remove.confirm}
          onConfirm={() => run(() => remove.mutateAsync(assignment.id), texts.remove.done)}
        />
      ) : null}
    </>
  );
}

function AssignmentsSkeleton() {
  return (
    <div className="grid gap-(--section-gap)" aria-busy="true">
      <p className="sr-only">{TEXTS.ui.loading}</p>
      {[0, 1].map((card) => (
        <Card key={card}>
          <CardHeader>
            <Skeleton className="h-5 w-64" />
          </CardHeader>
          {[0, 1].map((row) => (
            <div key={row} className="grid gap-2 border-t border-line px-5 py-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
