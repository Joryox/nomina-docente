"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";
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
import { Field, FormRequiredNote } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { ApiError, toUserMessage } from "@/lib/api-error";
import { applyServerFieldErrors } from "@/lib/form-errors";

import { useCreateSubject, useUpdateSubject } from "../hooks/use-subjects";
import { subjectFormSchema } from "../schemas/subjects";
import type { Subject, SubjectFormValues, SubjectPayload } from "../types/subjects";

const texts = TEXTS.setupForms.subject;
const screen = SCREENS.subjects.form;
const FIELDS = ["name", "code"] as const;

function initialValues(subject: Subject | undefined): SubjectFormValues {
  return { name: subject?.name ?? "", code: subject?.code ?? "" };
}

interface SubjectFormDialogProps {
  /** Con materia, el diálogo la edita; sin ella, registra una nueva. */
  subject?: Subject;
  /** Elemento que abre el diálogo; sin él, se controla con `open`. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Registra o edita una materia (RN-08). El servidor normaliza el nombre (RN-09). */
export function SubjectFormDialog({
  subject,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: SubjectFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const mutation = subject ? update : create;
  const form = useForm<SubjectFormValues, unknown, SubjectPayload>({
    resolver: zodResolver(subjectFormSchema),
    mode: "onTouched",
    defaultValues: initialValues(subject),
  });
  const { errors, isDirty } = form.formState;

  const changeOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) {
      form.reset(initialValues(subject));
      create.reset();
      update.reset();
    }
  };

  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.is("SUBJECT_ALREADY_EXISTS")) {
      form.setError("name", { message: error.message });
      return;
    }
    applyServerFieldErrors(error, FIELDS, (field, message) => form.setError(field, { message }));
  };

  const onSaved = (saved: Subject) => {
    toast.success(subject ? screen.saved(saved.name) : texts.saved(saved.name));
    changeOpen(false);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (mutation.isPending) {
      return;
    }
    if (subject) {
      update.mutate({ id: subject.id, changes: values }, { onSuccess: onSaved, onError });
    } else {
      create.mutate(values, { onSuccess: onSaved, onError });
    }
  });

  const error = mutation.error;
  const generalError =
    mutation.isError &&
    !(
      error instanceof ApiError &&
      (error.is("SUBJECT_ALREADY_EXISTS") || error.is("VALIDATION_ERROR"))
    );

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{subject ? screen.editTitle : texts.title}</DialogTitle>
            <DialogDescription>
              {subject ? screen.editDescription : texts.description}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-(--field-gap)">
            <FormRequiredNote />
            {generalError ? (
              <Alert tone="danger" announce>
                {toUserMessage(error)}
              </Alert>
            ) : null}
            <Field
              id="materia-nombre"
              label={texts.name}
              hint={texts.nameHint}
              required
              error={errors.name?.message}
            >
              <Input autoComplete="off" {...form.register("name")} />
            </Field>
            <Field
              id="materia-clave"
              label={texts.code}
              optional
              hint={texts.codeHint}
              error={errors.code?.message}
            >
              <Input autoComplete="off" spellCheck={false} {...form.register("code")} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => changeOpen(false)}>
              {TEXTS.ui.cancel}
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              loadingLabel={texts.submitting}
              disabled={Boolean(subject) && !isDirty}
            >
              {subject ? SCREENS.assignments.form.submitEdit : texts.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Botón «Agregar materia» con su diálogo (inicio y Mis materias). */
export function CreateSubjectDialog({ variant = "primary" }: Pick<ButtonProps, "variant">) {
  return (
    <SubjectFormDialog
      trigger={
        <Button variant={variant} size="sm">
          <Plus aria-hidden="true" />
          {texts.open}
        </Button>
      }
    />
  );
}
