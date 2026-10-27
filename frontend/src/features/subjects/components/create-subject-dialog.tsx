"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
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
import { TEXTS } from "@/constants/texts";
import { ApiError, toUserMessage } from "@/lib/api-error";
import { applyServerFieldErrors } from "@/lib/form-errors";

import { useCreateSubject } from "../hooks/use-subjects";
import { subjectFormSchema } from "../schemas/subjects";
import type { SubjectFormValues, SubjectPayload } from "../types/subjects";

const texts = TEXTS.setupForms.subject;
const FIELDS = ["name", "code"] as const;
const EMPTY: SubjectFormValues = { name: "", code: "" };

/** Registra una materia del docente (RN-08). El servidor normaliza el nombre (RN-09). */
export function CreateSubjectDialog({ variant = "primary" }: Pick<ButtonProps, "variant">) {
  const [open, setOpen] = useState(false);
  const create = useCreateSubject();
  const form = useForm<SubjectFormValues, unknown, SubjectPayload>({
    resolver: zodResolver(subjectFormSchema),
    mode: "onTouched",
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset(EMPTY);
      create.reset();
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (create.isPending) {
      return;
    }
    create.mutate(values, {
      onSuccess: (subject) => {
        toast.success(texts.saved(subject.name));
        changeOpen(false);
      },
      onError: (error) => {
        if (error instanceof ApiError && error.is("SUBJECT_ALREADY_EXISTS")) {
          form.setError("name", { message: error.message });
          return;
        }
        applyServerFieldErrors(error, FIELDS, (field, message) =>
          form.setError(field, { message }),
        );
      },
    });
  });

  const generalError =
    create.isError &&
    !(
      create.error instanceof ApiError &&
      (create.error.is("SUBJECT_ALREADY_EXISTS") || create.error.is("VALIDATION_ERROR"))
    );

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Plus aria-hidden="true" />
          {texts.open}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>{texts.title}</DialogTitle>
            <DialogDescription>{texts.description}</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-(--field-gap)">
            <FormRequiredNote />
            {generalError ? (
              <Alert tone="danger" announce>
                {toUserMessage(create.error)}
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
            <Button type="submit" loading={create.isPending} loadingLabel={texts.submitting}>
              {texts.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
