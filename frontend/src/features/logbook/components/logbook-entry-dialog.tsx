"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, type ReactNode } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
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
import { Field, FormField, FormRequiredNote } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { TimeRangeInput } from "@/components/ui/time-input";
import { toast } from "@/components/ui/toast";
import { API_MAX_PAGE_SIZE } from "@/constants/query";
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { FIELD_LIMITS } from "@/constants/validation";
import { useAssignments } from "@/features/assignments/hooks/use-assignments";
import { useBusinessRules } from "@/features/catalogs/hooks/use-catalogs";
import { toUserMessage, toWarningMessage } from "@/lib/api-error";
import type { ApiSchemas } from "@/lib/api-types";
import { addDays } from "@/lib/calendar";

import {
  useCreateLogbookEntry,
  useScheduledClasses,
  useUpdateLogbookEntry,
} from "../hooks/use-logbook";
import { logbookEntryFormSchema } from "../schemas/logbook";
import type {
  LogbookEntry,
  LogbookEntryChanges,
  LogbookEntryFormValues,
  LogbookEntryPayload,
  LogbookEntryResult,
} from "../types/logbook";

const texts = SCREENS.logbook.form;
const ALL_ASSIGNMENTS = { status: "all", page_size: API_MAX_PAGE_SIZE } as const;

type BusinessRules = ApiSchemas["BusinessRulesResponse"];
type EntryForm = UseFormReturn<LogbookEntryFormValues, unknown, LogbookEntryPayload>;

interface LogbookEntryDialogProps {
  /** Con sesión, el diálogo la edita; sin ella, registra una nueva. */
  entry?: LogbookEntry;
  /** Fecha propuesta para una sesión nueva (la elegida en la bitácora). */
  defaultDate?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Avisa de lo que el servidor permitió pero conviene revisar (sesión fuera de horario). */
export function announceResult(result: LogbookEntryResult, message: string) {
  toast.success(message);
  for (const warning of result.warnings) {
    toast.warning(toWarningMessage(warning));
  }
}

/**
 * Registra una sesión fuera de horario o con horas distintas, o edita una existente
 * (RN-19 a RN-22, RN-37 a RN-39). Al elegir clase y fecha se precargan las horas del horario.
 */
export function LogbookEntryDialog({
  entry,
  defaultDate,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: LogbookEntryDialogProps) {
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
          <EntryForm
            rules={rules.data}
            entry={entry}
            defaultDate={defaultDate ?? rules.data.today}
            onDone={() => changeOpen(false)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{entry ? texts.editTitle : texts.createTitle}</DialogTitle>
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

function changesOf(entry: LogbookEntry, values: LogbookEntryPayload): LogbookEntryChanges {
  const changes: LogbookEntryChanges = {};
  if (values.assignment_id !== entry.assignment.id) changes.assignment_id = values.assignment_id;
  if (values.session_date !== entry.session_date) changes.session_date = values.session_date;
  if (values.start_time !== entry.start_time) changes.start_time = values.start_time;
  if (values.end_time !== entry.end_time) changes.end_time = values.end_time;
  if (values.notes !== entry.notes) changes.notes = values.notes;
  return changes;
}

function EntryForm({
  rules,
  entry,
  defaultDate,
  onDone,
}: {
  rules: BusinessRules;
  entry: LogbookEntry | undefined;
  defaultDate: string;
  onDone: () => void;
}) {
  const create = useCreateLogbookEntry();
  const update = useUpdateLogbookEntry();
  const mutation = entry ? update : create;
  const schema = useMemo(
    () => logbookEntryFormSchema(rules, entry?.session_date),
    [rules, entry?.session_date],
  );
  const form = useForm<LogbookEntryFormValues, unknown, LogbookEntryPayload>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      assignment_id: entry?.assignment.id ?? "",
      session_date: entry?.session_date ?? defaultDate,
      start_time: entry?.start_time ?? "",
      end_time: entry?.end_time ?? "",
      notes: entry?.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (mutation.isPending) {
      return;
    }
    if (!entry) {
      create.mutate(values, {
        onSuccess: (result) => {
          announceResult(result, texts.created);
          onDone();
        },
      });
      return;
    }
    const changes = changesOf(entry, values);
    if (Object.keys(changes).length === 0) {
      onDone();
      return;
    }
    update.mutate(
      { id: entry.id, changes },
      {
        onSuccess: (result) => {
          announceResult(result, texts.saved);
          onDone();
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>{entry ? texts.editTitle : texts.createTitle}</DialogTitle>
        <DialogDescription>{texts.description}</DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-(--field-gap)">
        <FormRequiredNote />
        {mutation.isError ? (
          <Alert tone="danger" announce>
            {toUserMessage(mutation.error)}
          </Alert>
        ) : null}
        <EntryFields form={form} rules={rules} entry={entry} />
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          {TEXTS.ui.cancel}
        </Button>
        <Button type="submit" loading={mutation.isPending} loadingLabel={texts.submitting}>
          {entry ? texts.submitEdit : texts.submitCreate}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EntryFields({
  form,
  rules,
  entry,
}: {
  form: EntryForm;
  rules: BusinessRules;
  entry: LogbookEntry | undefined;
}) {
  const assignments = useAssignments(ALL_ASSIGNMENTS);
  const { errors } = form.formState;
  const [assignmentId, date, start, end] = useWatch({
    control: form.control,
    name: ["assignment_id", "session_date", "start_time", "end_time"],
  });
  const scheduled = useScheduledClasses(date || undefined);
  const scheduledForClass = scheduled.data?.classes.filter(
    (item) => item.assignment.id === assignmentId,
  );
  // Aviso previo (RN-39): la clase no está en el horario de ese día o con esas horas.
  const offSchedule =
    Boolean(assignmentId && start && end && scheduled.data) &&
    !scheduledForClass?.some((item) => item.start_time === start && item.end_time === end);

  /** Al elegir clase o fecha, precarga las horas del horario si aún no hay (RN-21). */
  const prefill = (nextAssignment: string, nextDate: string) => {
    if (form.getValues("start_time") || form.getValues("end_time")) {
      return;
    }
    const match =
      scheduled.data?.date === nextDate
        ? scheduled.data.classes.find((item) => item.assignment.id === nextAssignment)
        : undefined;
    if (match) {
      form.setValue("start_time", match.start_time);
      form.setValue("end_time", match.end_time);
    }
  };

  const options = (assignments.data?.items ?? [])
    .filter((assignment) => assignment.is_active || assignment.id === entry?.assignment.id)
    .map((assignment) => ({
      value: assignment.id,
      label: assignment.subject.name,
      description: assignment.career.name,
      keywords: [assignment.career.code],
    }));
  const oldest = addDays(rules.today, -rules.logbook_max_age_days);

  return (
    <>
      <FormField
        control={form.control}
        name="assignment_id"
        label={texts.assignment}
        required
        render={(field) => (
          <Combobox
            options={options}
            value={field.value || null}
            onChange={(value) => {
              field.onChange(value ?? "");
              if (value) prefill(value, date);
            }}
            onBlur={field.onBlur}
            placeholder={texts.assignmentPlaceholder}
            disabled={!assignments.data}
          />
        )}
      />
      <FormField
        control={form.control}
        name="session_date"
        label={texts.date}
        hint={SCREENS.logbook.dateHint(rules.logbook_max_age_days)}
        required
        render={(field) => (
          <DatePicker
            value={field.value || null}
            onChange={(value) => field.onChange(value ?? "")}
            onBlur={field.onBlur}
            min={entry && entry.session_date < oldest ? entry.session_date : oldest}
            disableFuture
          />
        )}
      />
      <TimeRangeInput
        required
        value={{ start: start || null, end: end || null }}
        onChange={(range) => {
          form.setValue("start_time", range.start ?? "", { shouldValidate: Boolean(range.start) });
          form.setValue("end_time", range.end ?? "", { shouldValidate: Boolean(range.end) });
        }}
        minDurationMinutes={rules.class_min_duration_minutes}
        maxDurationMinutes={rules.class_max_duration_minutes}
        errors={{ start: errors.start_time?.message, end: errors.end_time?.message }}
      />
      {offSchedule ? <Alert tone="warning">{texts.offScheduleNote}</Alert> : null}
      <Field
        id="sesion-notas"
        label={texts.notes}
        optional
        hint={texts.notesHint}
        error={errors.notes?.message}
      >
        <Textarea
          rows={3}
          maxLength={FIELD_LIMITS.logbookNotes}
          showCount
          {...form.register("notes")}
        />
      </Field>
    </>
  );
}
