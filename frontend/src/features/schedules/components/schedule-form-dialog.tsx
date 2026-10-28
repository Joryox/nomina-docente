"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { ShiftBadge } from "@/components/domain/shift-badge";

import { Alert } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormField, FormRequiredNote } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeRangeInput } from "@/components/ui/time-input";
import { toast } from "@/components/ui/toast";
import { API_MAX_PAGE_SIZE } from "@/constants/query";
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { useAssignments } from "@/features/assignments/hooks/use-assignments";
import { useBusinessRules } from "@/features/catalogs/hooks/use-catalogs";
import { toUserMessage } from "@/lib/api-error";
import type { ApiSchemas } from "@/lib/api-types";
import { formatClassContext } from "@/lib/formatters";
import { shiftOf } from "@/lib/shifts";

import { useCreateSchedules, useUpdateSchedule } from "../hooks/use-schedules";
import { newScheduleFormSchema, scheduleBatchFormSchema } from "../schemas/schedules";
import type {
  NewScheduleFormOutput,
  NewScheduleFormValues,
  ScheduleBatchFormOutput,
  ScheduleBatchFormValues,
} from "../types/schedules";
import { WeekdayPicker } from "./weekday-picker";

const texts = SCREENS.schedule.form;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const ACTIVE_ASSIGNMENTS = { status: "active", page_size: API_MAX_PAGE_SIZE } as const;
const EMPTY_RANGE = { weekdays: [], start_time: "", end_time: "" };

type BusinessRules = ApiSchemas["BusinessRulesResponse"];

/** Clases activas para el selector: la materia y, debajo, carrera y grupo. */
function useAssignmentOptions() {
  const assignments = useAssignments(ACTIVE_ASSIGNMENTS);
  const options = (assignments.data?.items ?? []).map((assignment) => ({
    value: assignment.id,
    label: assignment.subject.name,
    description: formatClassContext(assignment.career.name, assignment.group),
    keywords: [assignment.career.code, ...(assignment.group ? [assignment.group] : [])],
  }));
  return { options, loaded: Boolean(assignments.data) };
}

/** Horario existente que se edita: su clase no cambia, solo el día y las horas. */
export interface EditableSchedule {
  id: string;
  assignmentId: string;
  assignmentLabel: string;
  weekday: number;
  startTime: string;
  endTime: string;
}

interface ScheduleFormDialogProps {
  schedule?: EditableSchedule;
  /** Clase preseleccionada al agregar un horario desde Mis clases. */
  assignmentId?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Agrega horarios de varios días (RN-42) o edita uno (RN-16 a RN-18, RN-36). */
export function ScheduleFormDialog({
  schedule,
  assignmentId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ScheduleFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const rules = useBusinessRules();
  const changeOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        {rules.data && open ? (
          schedule ? (
            <ScheduleForm rules={rules.data} schedule={schedule} onDone={() => changeOpen(false)} />
          ) : (
            <ScheduleBatchForm
              rules={rules.data}
              assignmentId={assignmentId}
              onDone={() => changeOpen(false)}
            />
          )
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{schedule ? texts.editTitle : texts.createTitle}</DialogTitle>
              <DialogDescription>
                {schedule ? texts.editDescription : texts.description}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {rules.isError ? (
                <Alert tone="danger">{toUserMessage(rules.error)}</Alert>
              ) : (
                <div className="grid gap-3" aria-busy="true">
                  <p className="sr-only">{TEXTS.ui.loading}</p>
                  <Skeleton className="h-(--control-height-md) w-full" />
                  <Skeleton className="h-(--control-height-md) w-full" />
                </div>
              )}
            </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Edita un horario existente: su clase no cambia, solo el día y las horas. */
function ScheduleForm({
  rules,
  schedule,
  onDone,
}: {
  rules: BusinessRules;
  schedule: EditableSchedule;
  onDone: () => void;
}) {
  const update = useUpdateSchedule();
  const { options: assignmentOptions } = useAssignmentOptions();
  const schema = useMemo(() => newScheduleFormSchema(rules), [rules]);
  const form = useForm<NewScheduleFormValues, unknown, NewScheduleFormOutput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      assignment_id: schedule.assignmentId,
      weekday: String(schedule.weekday),
      start_time: schedule.startTime,
      end_time: schedule.endTime,
    },
  });
  const { errors } = form.formState;
  const [start, end] = useWatch({ control: form.control, name: ["start_time", "end_time"] });

  const onSubmit = form.handleSubmit(({ weekday, start_time, end_time }) => {
    if (update.isPending) {
      return;
    }
    update.mutate(
      { id: schedule.id, changes: { weekday, start_time, end_time } },
      {
        onSuccess: () => {
          toast.success(texts.saved);
          onDone();
        },
      },
    );
  });

  if (!assignmentOptions.some((option) => option.value === schedule.assignmentId)) {
    assignmentOptions.push({
      value: schedule.assignmentId,
      label: schedule.assignmentLabel,
      description: "",
      keywords: [],
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{texts.editTitle}</DialogTitle>
        <DialogDescription>{texts.editDescription}</DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-(--field-gap)">
        <FormRequiredNote />
        {update.isError ? (
          <Alert tone="danger" announce>
            {toUserMessage(update.error)}
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="assignment_id"
          label={texts.assignment}
          required
          render={(field) => (
            <Combobox
              options={assignmentOptions}
              value={field.value || null}
              onChange={(value) => field.onChange(value ?? "")}
              onBlur={field.onBlur}
              placeholder={texts.assignmentPlaceholder}
              disabled
            />
          )}
        />
        <FormField
          control={form.control}
          name="weekday"
          label={texts.weekday}
          required
          render={(field) => (
            <Select
              value={field.value ? String(field.value) : undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger onBlur={field.onBlur}>
                <SelectValue placeholder={texts.weekdayPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((weekday) => (
                  <SelectItem key={weekday} value={String(weekday)} className="capitalize">
                    {TEXTS.calendar.weekdays[weekday]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <TimeRangeInput
          required
          value={{ start: start || null, end: end || null }}
          onChange={(range) => {
            form.setValue("start_time", range.start ?? "", {
              shouldValidate: Boolean(range.start),
            });
            form.setValue("end_time", range.end ?? "", { shouldValidate: Boolean(range.end) });
          }}
          minDurationMinutes={rules.class_min_duration_minutes}
          maxDurationMinutes={rules.class_max_duration_minutes}
          errors={{ start: errors.start_time?.message, end: errors.end_time?.message }}
        />
        {start ? <ShiftBadge shift={shiftOf(start, rules.afternoon_shift_start)} /> : null}
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {TEXTS.ui.cancel}
        </Button>
        <Button type="submit" loading={update.isPending} loadingLabel={texts.submitting}>
          {texts.submitEdit}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Captura de varios días (RN-42): una clase, uno o más rangos de horas y, en cada rango,
 * los días en que se repite. El servidor guarda todos los horarios o ninguno.
 */
function ScheduleBatchForm({
  rules,
  assignmentId,
  onDone,
}: {
  rules: BusinessRules;
  assignmentId: string | undefined;
  onDone: () => void;
}) {
  const create = useCreateSchedules();
  const { options: assignmentOptions, loaded } = useAssignmentOptions();
  const schema = useMemo(() => scheduleBatchFormSchema(rules), [rules]);
  const form = useForm<ScheduleBatchFormValues, unknown, ScheduleBatchFormOutput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { assignment_id: assignmentId ?? "", ranges: [EMPTY_RANGE] },
  });
  const ranges = useFieldArray({ control: form.control, name: "ranges" });
  const values = useWatch({ control: form.control, name: "ranges" });
  const count = values.reduce((total, range) => total + range.weekdays.length, 0);
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(({ assignment_id, ranges: batch }) => {
    if (create.isPending) {
      return;
    }
    create.mutate(
      { assignmentId: assignment_id, batch: { ranges: batch } },
      {
        onSuccess: (created) => {
          toast.success(texts.created(created.length));
          onDone();
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{texts.createTitle}</DialogTitle>
        <DialogDescription>{texts.description}</DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-(--field-gap)">
        <FormRequiredNote />
        {create.isError ? (
          <Alert tone="danger" announce>
            {toUserMessage(create.error)}
          </Alert>
        ) : null}
        <FormField
          control={form.control}
          name="assignment_id"
          label={texts.assignment}
          required
          render={(field) => (
            <Combobox
              options={assignmentOptions}
              value={field.value || null}
              onChange={(value) => field.onChange(value ?? "")}
              onBlur={field.onBlur}
              placeholder={texts.assignmentPlaceholder}
              disabled={!loaded}
            />
          )}
        />
        {ranges.fields.map((range, index) => {
          const current = values[index] ?? EMPTY_RANGE;
          const rangeErrors = errors.ranges?.[index];
          return (
            <section
              key={range.id}
              aria-label={texts.rangeLegend(index + 1)}
              className="grid gap-3 rounded-md border border-line bg-surface-sunken p-3"
            >
              {ranges.fields.length > 1 ? (
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-label font-semibold text-fg">
                    {texts.rangeLegend(index + 1)}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={texts.removeRange(index + 1)}
                    onClick={() => ranges.remove(index)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
              <WeekdayPicker
                label={texts.days}
                hint={index === 0 ? texts.daysHint : undefined}
                value={current.weekdays}
                onChange={(weekdays) =>
                  form.setValue(`ranges.${index}.weekdays`, weekdays, {
                    shouldValidate: form.formState.isSubmitted,
                    shouldTouch: true,
                  })
                }
                error={rangeErrors?.weekdays?.message}
              />
              <TimeRangeInput
                required
                value={{ start: current.start_time || null, end: current.end_time || null }}
                onChange={(next) => {
                  form.setValue(`ranges.${index}.start_time`, next.start ?? "", {
                    shouldValidate: Boolean(next.start),
                  });
                  form.setValue(`ranges.${index}.end_time`, next.end ?? "", {
                    shouldValidate: Boolean(next.end),
                  });
                }}
                minDurationMinutes={rules.class_min_duration_minutes}
                maxDurationMinutes={rules.class_max_duration_minutes}
                errors={{
                  start: rangeErrors?.start_time?.message,
                  end: rangeErrors?.end_time?.message,
                }}
              />
              {current.start_time ? (
                <ShiftBadge shift={shiftOf(current.start_time, rules.afternoon_shift_start)} />
              ) : null}
            </section>
          );
        })}
        {ranges.fields.length < rules.schedule_batch_max_ranges ? (
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => ranges.append(EMPTY_RANGE)}
          >
            <Plus aria-hidden="true" />
            {texts.addRange}
          </Button>
        ) : null}
        <div className="grid gap-1 text-small text-fg-muted">
          <p aria-live="polite" className="font-medium text-fg figures">
            {count > 0 ? texts.summary(count) : null}
          </p>
          <p>{texts.allOrNothing}</p>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {TEXTS.ui.cancel}
        </Button>
        <Button type="submit" loading={create.isPending} loadingLabel={texts.submitting}>
          {texts.submitCreate(count)}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Botón «Agregar horario» con su diálogo (inicio, Horario y Mis clases). */
export function CreateScheduleDialog({
  variant = "primary",
  size = "sm",
  assignmentId,
}: Pick<ButtonProps, "variant" | "size"> & { assignmentId?: string }) {
  return (
    <ScheduleFormDialog
      assignmentId={assignmentId}
      trigger={
        <Button variant={variant} size={size}>
          <Plus aria-hidden="true" />
          {SCREENS.schedule.add}
        </Button>
      }
    />
  );
}
