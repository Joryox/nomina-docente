"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";

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

import { useCreateSchedule, useUpdateSchedule } from "../hooks/use-schedules";
import { newScheduleFormSchema } from "../schemas/schedules";
import type { NewScheduleFormOutput, NewScheduleFormValues } from "../types/schedules";

const texts = SCREENS.schedule.form;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const ACTIVE_ASSIGNMENTS = { status: "active", page_size: API_MAX_PAGE_SIZE } as const;

type BusinessRules = ApiSchemas["BusinessRulesResponse"];

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

/** Agrega o edita un horario semanal (RN-16 a RN-18, RN-36). */
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
          <ScheduleForm
            rules={rules.data}
            schedule={schedule}
            assignmentId={assignmentId}
            onDone={() => changeOpen(false)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{schedule ? texts.editTitle : texts.createTitle}</DialogTitle>
              <DialogDescription>{texts.description}</DialogDescription>
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

function ScheduleForm({
  rules,
  schedule,
  assignmentId,
  onDone,
}: {
  rules: BusinessRules;
  schedule: EditableSchedule | undefined;
  assignmentId: string | undefined;
  onDone: () => void;
}) {
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const mutation = schedule ? update : create;
  const assignments = useAssignments(ACTIVE_ASSIGNMENTS);
  const schema = useMemo(() => newScheduleFormSchema(rules), [rules]);
  const form = useForm<NewScheduleFormValues, unknown, NewScheduleFormOutput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      assignment_id: schedule?.assignmentId ?? assignmentId ?? "",
      weekday: schedule ? String(schedule.weekday) : "",
      start_time: schedule?.startTime ?? "",
      end_time: schedule?.endTime ?? "",
    },
  });
  const { errors } = form.formState;
  const [start, end] = useWatch({ control: form.control, name: ["start_time", "end_time"] });

  const onSubmit = form.handleSubmit(({ assignment_id, ...values }) => {
    if (mutation.isPending) {
      return;
    }
    if (schedule) {
      update.mutate(
        { id: schedule.id, changes: values },
        {
          onSuccess: () => {
            toast.success(texts.saved);
            onDone();
          },
        },
      );
      return;
    }
    create.mutate(
      { assignmentId: assignment_id, schedule: values },
      {
        onSuccess: () => {
          toast.success(texts.created, { description: texts.addAnother });
          onDone();
        },
      },
    );
  });

  const assignmentOptions = (assignments.data?.items ?? []).map((assignment) => ({
    value: assignment.id,
    label: assignment.subject.name,
    description: assignment.career.name,
    keywords: [assignment.career.code],
  }));
  if (schedule && !assignmentOptions.some((option) => option.value === schedule.assignmentId)) {
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
        <DialogTitle>{schedule ? texts.editTitle : texts.createTitle}</DialogTitle>
        <DialogDescription>{texts.description}</DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-(--field-gap)">
        <FormRequiredNote />
        {mutation.isError ? (
          <Alert tone="danger" announce>
            {toUserMessage(mutation.error)}
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
              disabled={Boolean(schedule) || !assignments.data}
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
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {TEXTS.ui.cancel}
        </Button>
        <Button type="submit" loading={mutation.isPending} loadingLabel={texts.submitting}>
          {schedule ? texts.submitEdit : texts.submitCreate}
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
