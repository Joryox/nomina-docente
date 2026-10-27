"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
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
import { TEXTS } from "@/constants/texts";
import { useAssignments } from "@/features/assignments/hooks/use-assignments";
import { useBusinessRules } from "@/features/catalogs/hooks/use-catalogs";
import { toUserMessage } from "@/lib/api-error";
import type { ApiSchemas } from "@/lib/api-types";

import { useCreateSchedule } from "../hooks/use-schedules";
import { newScheduleFormSchema } from "../schemas/schedules";
import type { NewScheduleFormOutput, NewScheduleFormValues } from "../types/schedules";

const texts = TEXTS.setupForms.schedule;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const ACTIVE_ASSIGNMENTS = { status: "active", page_size: API_MAX_PAGE_SIZE } as const;

type BusinessRules = ApiSchemas["BusinessRulesResponse"];

/** Agrega un horario semanal a una asignación activa (RN-16 a RN-18, RN-36). */
export function CreateScheduleDialog({ variant = "primary" }: Pick<ButtonProps, "variant">) {
  const [open, setOpen] = useState(false);
  const rules = useBusinessRules();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Plus aria-hidden="true" />
          {texts.open}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {rules.data ? (
          <ScheduleForm rules={rules.data} onDone={() => setOpen(false)} />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{texts.title}</DialogTitle>
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

const EMPTY: NewScheduleFormValues = {
  assignment_id: "",
  weekday: "",
  start_time: "",
  end_time: "",
};

function ScheduleForm({ rules, onDone }: { rules: BusinessRules; onDone: () => void }) {
  const create = useCreateSchedule();
  const assignments = useAssignments(ACTIVE_ASSIGNMENTS);
  const schema = useMemo(() => newScheduleFormSchema(rules), [rules]);
  const form = useForm<NewScheduleFormValues, unknown, NewScheduleFormOutput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;
  const [start, end] = useWatch({ control: form.control, name: ["start_time", "end_time"] });

  const onSubmit = form.handleSubmit(({ assignment_id, ...schedule }) => {
    if (create.isPending) {
      return;
    }
    create.mutate(
      { assignmentId: assignment_id, schedule },
      {
        onSuccess: () => {
          toast.success(texts.saved, { description: texts.addAnother });
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

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{texts.title}</DialogTitle>
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
              disabled={!assignments.data}
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
        <Button type="submit" loading={create.isPending} loadingLabel={texts.submitting}>
          {texts.submit}
        </Button>
      </DialogFooter>
    </form>
  );
}
