"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";

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
import { Field, FormField, FormRequiredNote } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { useCareers, useHourlyRates } from "@/features/catalogs/hooks/use-catalogs";
import { useCreateSubject, useSubjects } from "@/features/subjects/hooks/use-subjects";
import { toUserMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/formatters";

import { useCreateAssignment, useUpdateAssignment } from "../hooks/use-assignments";
import { assignmentFormSchema } from "../schemas/assignments";
import type {
  Assignment,
  AssignmentChanges,
  AssignmentFormValues,
  AssignmentPayload,
} from "../types/assignments";

const texts = SCREENS.assignments.form;
const ACTIVE_SUBJECTS = { status: "active", page_size: API_MAX_PAGE_SIZE } as const;

type AssignmentForm = UseFormReturn<AssignmentFormValues, unknown, AssignmentPayload>;

function initialValues(assignment: Assignment | undefined): AssignmentFormValues {
  return {
    subject_id: assignment?.subject.id ?? "",
    career_code: assignment?.career.code ?? "",
    hourly_rate: assignment?.hourly_rate.amount ?? "",
  };
}

/** Solo lo que cambió: la tarifa siempre; materia y carrera solo sin bitácora (RN-34). */
function changesOf(assignment: Assignment, values: AssignmentPayload): AssignmentChanges {
  const changes: AssignmentChanges = {};
  if (values.subject_id !== assignment.subject.id) {
    changes.subject_id = values.subject_id;
  }
  if (values.career_code !== assignment.career.code) {
    changes.career_code = values.career_code;
  }
  if (values.hourly_rate !== assignment.hourly_rate.amount) {
    changes.hourly_rate = values.hourly_rate;
  }
  return changes;
}

interface AssignmentFormDialogProps {
  assignment?: Assignment;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Crea o edita una clase eligiendo materia, carrera y tarifa de listas (RN-13, RN-06, RN-11). */
export function AssignmentFormDialog({
  assignment,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: AssignmentFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const create = useCreateAssignment();
  const update = useUpdateAssignment();
  const mutation = assignment ? update : create;
  const form = useForm<AssignmentFormValues, unknown, AssignmentPayload>({
    resolver: zodResolver(assignmentFormSchema),
    mode: "onTouched",
    defaultValues: initialValues(assignment),
  });

  const changeOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) {
      form.reset(initialValues(assignment));
      create.reset();
      update.reset();
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (mutation.isPending) {
      return;
    }
    if (!assignment) {
      create.mutate(values, {
        onSuccess: (created) => {
          toast.success(texts.created(created.subject.name, created.career.code));
          changeOpen(false);
        },
      });
      return;
    }
    const changes = changesOf(assignment, values);
    if (Object.keys(changes).length === 0) {
      changeOpen(false);
      return;
    }
    update.mutate(
      { id: assignment.id, changes },
      {
        onSuccess: () => {
          toast.success(texts.saved);
          changeOpen(false);
        },
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{assignment ? texts.editTitle : texts.createTitle}</DialogTitle>
            <DialogDescription>{texts.description}</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-(--field-gap)">
            <FormRequiredNote />
            {mutation.isError ? (
              <Alert tone="danger" announce>
                {toUserMessage(mutation.error)}
              </Alert>
            ) : null}
            {open ? <AssignmentFields form={form} assignment={assignment} /> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => changeOpen(false)}>
              {TEXTS.ui.cancel}
            </Button>
            <Button type="submit" loading={mutation.isPending} loadingLabel={texts.submitting}>
              {assignment ? texts.submitEdit : texts.submitCreate}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Los selectores se alimentan de la API: nada se escribe a mano. */
function AssignmentFields({
  form,
  assignment,
}: {
  form: AssignmentForm;
  assignment: Assignment | undefined;
}) {
  const subjects = useSubjects(ACTIVE_SUBJECTS);
  const careers = useCareers();
  const rates = useHourlyRates();
  const locked = assignment?.has_logbook ?? false;

  if (subjects.isError || careers.isError || rates.isError) {
    return <Alert tone="danger">{TEXTS.setupForms.assignment.loadError}</Alert>;
  }
  if (!subjects.data || !careers.data || !rates.data) {
    return (
      <div className="grid gap-(--field-gap)" aria-busy="true">
        <p className="sr-only">{TEXTS.ui.loading}</p>
        {[0, 1, 2].map((index) => (
          <div key={index} className="grid gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-(--control-height-md) w-full" />
          </div>
        ))}
      </div>
    );
  }

  const subjectOptions = subjects.data.items.map((subject) => ({
    value: subject.id,
    label: subject.name,
    description: subject.code ?? undefined,
    keywords: subject.code ? [subject.code] : undefined,
  }));
  if (assignment && !subjectOptions.some((option) => option.value === assignment.subject.id)) {
    subjectOptions.push({
      value: assignment.subject.id,
      label: assignment.subject.name,
      description: assignment.subject.code ?? undefined,
      keywords: undefined,
    });
  }
  const careerOptions = careers.data.map((career) => ({
    value: career.code,
    label: career.name,
    description: career.code,
    keywords: [career.code],
    group: career.career_type.name,
  }));
  if (assignment && !careerOptions.some((option) => option.value === assignment.career.code)) {
    careerOptions.push({
      value: assignment.career.code,
      label: assignment.career.name,
      description: assignment.career.code,
      keywords: [assignment.career.code],
      group: assignment.career.career_type.name,
    });
  }
  // La tarifa actual se conserva como opción aunque ya no esté vigente.
  const rateAmounts = rates.data.map((rate) => rate.amount);
  if (assignment && !rateAmounts.includes(assignment.hourly_rate.amount)) {
    rateAmounts.push(assignment.hourly_rate.amount);
  }

  return (
    <>
      {locked ? <Alert tone="info">{texts.lockedByLogbook}</Alert> : null}
      <FormField
        control={form.control}
        name="subject_id"
        label={texts.subject}
        required
        render={(field) => (
          <Combobox
            options={subjectOptions}
            value={field.value || null}
            onChange={(value) => field.onChange(value ?? "")}
            onBlur={field.onBlur}
            placeholder={texts.subjectPlaceholder}
            disabled={locked}
          />
        )}
      />
      {locked ? null : (
        <InlineNewSubject
          onCreated={(id) => form.setValue("subject_id", id, { shouldValidate: true })}
        />
      )}
      <FormField
        control={form.control}
        name="career_code"
        label={texts.career}
        required
        render={(field) => (
          <Combobox
            options={careerOptions}
            value={field.value || null}
            onChange={(value) => field.onChange(value ?? "")}
            onBlur={field.onBlur}
            placeholder={texts.careerPlaceholder}
            disabled={locked}
          />
        )}
      />
      <FormField
        control={form.control}
        name="hourly_rate"
        label={texts.rate}
        hint={assignment ? texts.rateChangeNote : texts.rateHint}
        required
        render={(field) => (
          <Select value={field.value || undefined} onValueChange={field.onChange}>
            <SelectTrigger onBlur={field.onBlur}>
              <SelectValue placeholder={texts.ratePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {rateAmounts.map((amount) => (
                <SelectItem key={amount} value={amount}>
                  {formatMoney(amount)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </>
  );
}

const inline = SCREENS.common.newSubjectInline;

/** Alta rápida de una materia sin salir del formulario: queda elegida al guardarse. */
function InlineNewSubject({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useCreateSubject();

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed || create.isPending) {
      return;
    }
    create.mutate(
      { name: trimmed, code: null },
      {
        onSuccess: (subject) => {
          onCreated(subject.id);
          toast.success(TEXTS.setupForms.subject.saved(subject.name));
          setName("");
          setOpen(false);
          create.reset();
        },
      },
    );
  };

  if (!open) {
    return (
      <Button
        variant="link"
        size="sm"
        className="-mt-2 justify-self-start"
        onClick={() => setOpen(true)}
      >
        <Plus aria-hidden="true" />
        {inline.toggle}
      </Button>
    );
  }
  return (
    <div className="-mt-2 grid gap-2 rounded-md border border-line bg-surface-sunken p-3">
      <Field
        label={inline.label}
        hint={inline.hint}
        error={create.isError ? toUserMessage(create.error) : undefined}
      >
        <Input
          autoFocus
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            // Enter guarda la materia sin enviar el formulario de la clase.
            if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={create.isPending} loadingLabel={inline.saving} onClick={save}>
          {inline.save}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {inline.close}
        </Button>
      </div>
    </div>
  );
}

/** Botón «Crear asignación» con su diálogo (guía del inicio). */
export function CreateAssignmentDialog({ variant = "primary" }: Pick<ButtonProps, "variant">) {
  return (
    <AssignmentFormDialog
      trigger={
        <Button variant={variant} size="sm">
          <Plus aria-hidden="true" />
          {TEXTS.setupForms.assignment.open}
        </Button>
      }
    />
  );
}
