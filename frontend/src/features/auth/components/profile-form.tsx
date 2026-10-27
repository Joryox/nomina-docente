"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FormRequiredNote } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { TEXTS } from "@/constants/texts";
import { ApiError, toUserMessage } from "@/lib/api-error";
import { applyServerFieldErrors } from "@/lib/form-errors";

import { useUpdateProfile } from "../hooks/use-auth-mutations";
import {
  profileFormSchema,
  type ProfileFormOutput,
  type ProfileFormValues,
} from "../schemas/forms";
import type { Me } from "../types/auth";

const texts = TEXTS.profile.personal;
const fields = TEXTS.auth.fields;
const FIELDS = ["first_names", "paternal_surname", "maternal_surname", "employee_number"] as const;

function initialValues(me: Me): ProfileFormValues {
  return {
    first_names: me.teacher?.first_names ?? "",
    paternal_surname: me.teacher?.paternal_surname ?? "",
    maternal_surname: me.teacher?.maternal_surname ?? "",
    employee_number: me.teacher?.employee_number ?? "",
  };
}

/** Nombres, apellidos y número de empleado. El correo se muestra aparte, de solo lectura. */
export function ProfileForm({ me }: { me: Me }) {
  const update = useUpdateProfile();
  const form = useForm<ProfileFormValues, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    mode: "onTouched",
    defaultValues: initialValues(me),
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    if (update.isPending) {
      return;
    }
    update.mutate(
      {
        ...values,
        maternal_surname: values.maternal_surname || null,
        employee_number: values.employee_number || null,
      },
      {
        onSuccess: (saved) => {
          form.reset(initialValues(saved));
          toast.success(texts.saved);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.is("EMPLOYEE_NUMBER_ALREADY_REGISTERED")) {
            form.setError("employee_number", { message: error.message });
            return;
          }
          applyServerFieldErrors(error, FIELDS, (field, message) =>
            form.setError(field, { message }),
          );
        },
      },
    );
  });

  const generalError =
    update.isError &&
    !(update.error instanceof ApiError && update.error.is("EMPLOYEE_NUMBER_ALREADY_REGISTERED"));

  return (
    <Card aria-labelledby="perfil-datos">
      <CardHeader>
        <div>
          <CardTitle id="perfil-datos">{texts.title}</CardTitle>
          <CardDescription>{texts.description}</CardDescription>
        </div>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="grid gap-(--field-gap)">
          <FormRequiredNote />
          {generalError ? (
            <Alert tone="danger" announce>
              {toUserMessage(update.error)}
            </Alert>
          ) : null}
          <Field id="perfil-correo" label={fields.email} hint={TEXTS.auth.hints.emailReadOnly}>
            <Input type="email" value={me.account.email} readOnly className="bg-surface-sunken" />
          </Field>
          <div className="grid gap-(--field-gap) sm:grid-cols-2">
            <Field
              id="first_names"
              label={fields.firstNames}
              required
              error={errors.first_names?.message}
              className="sm:col-span-2"
            >
              <Input autoComplete="given-name" {...form.register("first_names")} />
            </Field>
            <Field
              id="paternal_surname"
              label={fields.paternalSurname}
              required
              error={errors.paternal_surname?.message}
            >
              <Input autoComplete="family-name" {...form.register("paternal_surname")} />
            </Field>
            <Field
              id="maternal_surname"
              label={fields.maternalSurname}
              optional
              error={errors.maternal_surname?.message}
            >
              <Input autoComplete="additional-name" {...form.register("maternal_surname")} />
            </Field>
          </div>
          <Field
            id="employee_number"
            label={fields.employeeNumber}
            optional
            hint={TEXTS.auth.hints.employeeNumber}
            error={errors.employee_number?.message}
          >
            <Input autoComplete="off" spellCheck={false} {...form.register("employee_number")} />
          </Field>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            loading={update.isPending}
            loadingLabel={texts.submitting}
            disabled={!isDirty}
          >
            {texts.submit}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
