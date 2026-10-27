import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TEXTS } from "@/constants/texts";
import { CreateAssignmentDialog } from "@/features/assignments/components/create-assignment-dialog";
import { CreateScheduleDialog } from "@/features/schedules/components/create-schedule-dialog";
import { CreateSubjectDialog } from "@/features/subjects/components/create-subject-dialog";
import { cn } from "@/lib/utils";

import type { SetupProgress } from "../types/dashboard";

const texts = TEXTS.dashboard.setup;

/**
 * El docente necesita la guía mientras no tenga materias, asignaciones u horarios y aún no
 * registre clases. Quien ya tiene bitácora ve el panel aunque haya desactivado todo.
 */
export function needsSetup(setup: SetupProgress): boolean {
  return (
    setup.session_count === 0 &&
    (setup.subject_count === 0 || setup.active_assignment_count === 0 || setup.schedule_count === 0)
  );
}

interface Step {
  id: string;
  title: string;
  description: string;
  done: boolean;
  summary: string;
  /** Motivo por el que aún no se puede hacer (falta el paso anterior). */
  blocked?: string;
  action: (isNext: boolean) => ReactNode;
}

function steps(setup: SetupProgress): Step[] {
  const { subjects, assignments, schedules } = texts.steps;
  return [
    {
      id: "materias",
      title: subjects.title,
      description: subjects.description,
      done: setup.subject_count > 0,
      summary: subjects.count(setup.subject_count),
      action: (isNext) => <CreateSubjectDialog variant={isNext ? "primary" : "outline"} />,
    },
    {
      id: "asignaciones",
      title: assignments.title,
      description: assignments.description,
      done: setup.active_assignment_count > 0,
      summary: assignments.count(setup.active_assignment_count),
      blocked: setup.subject_count === 0 ? assignments.blocked : undefined,
      action: (isNext) => <CreateAssignmentDialog variant={isNext ? "primary" : "outline"} />,
    },
    {
      id: "horarios",
      title: schedules.title,
      description: schedules.description,
      done: setup.schedule_count > 0,
      summary: schedules.count(setup.schedule_count),
      blocked: setup.active_assignment_count === 0 ? schedules.blocked : undefined,
      action: (isNext) => <CreateScheduleDialog variant={isNext ? "primary" : "outline"} />,
    },
  ];
}

/** Guía de configuración inicial: tres pasos que se marcan con los datos reales. */
export function SetupGuide({ setup }: { setup: SetupProgress }) {
  const list = steps(setup);
  const completed = list.filter((step) => step.done).length;
  const nextId = list.find((step) => !step.done)?.id;

  return (
    <Card aria-labelledby="inicio-configura" className="max-w-content">
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle id="inicio-configura">{texts.title}</CardTitle>
          <CardDescription className="max-w-prose">{texts.description}</CardDescription>
        </div>
        <p className="text-small font-medium text-fg-muted figures">
          {texts.progress(completed, list.length)}
        </p>
      </CardHeader>
      <ol className="divide-y divide-line">
        {list.map((step, index) => (
          <li
            key={step.id}
            aria-current={step.id === nextId ? "step" : undefined}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start"
          >
            <span
              aria-hidden="true"
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-label font-semibold figures",
                step.done
                  ? "border-success-line bg-success-soft text-success-ink"
                  : step.id === nextId
                    ? "border-primary bg-primary text-on-primary"
                    : "border-line bg-surface-sunken text-fg-muted",
              )}
            >
              {step.done ? <Check className="size-4" /> : index + 1}
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-label font-semibold text-fg">{step.title}</h3>
                <Badge tone={step.done ? "success" : "neutral"}>
                  {step.done ? texts.done : texts.pendingStep}
                </Badge>
              </div>
              <p className="max-w-prose text-body text-fg-muted">{step.description}</p>
              {step.done ? <p className="text-small text-success-ink">{step.summary}</p> : null}
              {step.blocked ? <p className="text-small text-fg-muted">{step.blocked}</p> : null}
            </div>
            {step.blocked ? null : (
              <div className="shrink-0">{step.action(step.id === nextId)}</div>
            )}
          </li>
        ))}
      </ol>
      <CardContent className="border-t border-line text-small text-fg-muted">
        {texts.after}
      </CardContent>
    </Card>
  );
}
