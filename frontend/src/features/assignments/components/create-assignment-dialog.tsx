"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
import { toast } from "@/components/ui/toast";
import { API_MAX_PAGE_SIZE } from "@/constants/query";
import { TEXTS } from "@/constants/texts";
import { useCareers, useHourlyRates } from "@/features/catalogs/hooks/use-catalogs";
import { useSubjects } from "@/features/subjects/hooks/use-subjects";
import { toUserMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/formatters";

import { useCreateAssignment } from "../hooks/use-assignments";
import { assignmentFormSchema } from "../schemas/assignments";
import type { AssignmentFormValues, AssignmentPayload } from "../types/assignments";

const texts = TEXTS.setupForms.assignment;
const EMPTY: AssignmentFormValues = { subject_id: "", career_code: "", hourly_rate: "" };
const ACTIVE_SUBJECTS = { status: "active", page_size: API_MAX_PAGE_SIZE } as const;

/** Crea una asignación eligiendo materia, carrera y tarifa de listas (RN-13, RN-06, RN-11). */
export function CreateAssignmentDialog({ variant = "primary" }: Pick<ButtonProps, "variant">) {
  const [open, setOpen] = useState(false);
  const create = useCreateAssignment();
  const form = useForm<AssignmentFormValues, unknown, AssignmentPayload>({
    resolver: zodResolver(assignmentFormSchema),
    mode: "onTouched",
    defaultValues: EMPTY,
  });

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
      onSuccess: (assignment) => {
        toast.success(texts.saved(assignment.subject.name, assignment.career.code));
        changeOpen(false);
      },
    });
  });

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
            {create.isError ? (
              <Alert tone="danger" announce>
                {toUserMessage(create.error)}
              </Alert>
            ) : null}
            {open ? <AssignmentFields form={form} /> : null}
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

type AssignmentForm = ReturnType<typeof useForm<AssignmentFormValues, unknown, AssignmentPayload>>;

/** Los selectores se alimentan de la API: nada se escribe a mano. */
function AssignmentFields({ form }: { form: AssignmentForm }) {
  const subjects = useSubjects(ACTIVE_SUBJECTS);
  const careers = useCareers();
  const rates = useHourlyRates();

  if (subjects.isError || careers.isError || rates.isError) {
    return <Alert tone="danger">{texts.loadError}</Alert>;
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
  }));
  const careerOptions = careers.data.map((career) => ({
    value: career.code,
    label: career.name,
    description: career.code,
    keywords: [career.code],
    group: career.career_type.name,
  }));

  return (
    <>
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
          />
        )}
      />
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
          />
        )}
      />
      <FormField
        control={form.control}
        name="hourly_rate"
        label={texts.rate}
        hint={texts.rateHint}
        required
        render={(field) => (
          <Select value={field.value || undefined} onValueChange={field.onChange}>
            <SelectTrigger onBlur={field.onBlur}>
              <SelectValue placeholder={texts.ratePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {rates.data.map((rate) => (
                <SelectItem key={rate.amount} value={rate.amount}>
                  {formatMoney(rate.amount)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </>
  );
}
