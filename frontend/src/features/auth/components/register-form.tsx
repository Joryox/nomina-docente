"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FormRequiredNote } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TEXTS } from "@/constants/texts";
import { ApiError, toUserMessage } from "@/lib/api-error";
import { applyServerFieldErrors } from "@/lib/form-errors";

import { useRegister } from "../hooks/use-auth-mutations";
import { usePasswordPolicy } from "../hooks/use-password-policy";
import { passwordRuleSchema } from "../schemas/password-policy";
import {
  registerFormSchema,
  type RegisterFormOutput,
  type RegisterFormValues,
} from "../schemas/forms";
import type { PasswordPolicy, RegisterPayload } from "../types/auth";
import { describeRule, PasswordRequirements } from "./password-requirements";

const texts = TEXTS.auth;
const FIELDS = [
  "email",
  "password",
  "first_names",
  "paternal_surname",
  "maternal_surname",
  "employee_number",
] as const;
type Field = (typeof FIELDS)[number];

/** Errores de negocio del backend que corresponden a un campo concreto. */
const FIELD_BY_ERROR_CODE: Readonly<Record<string, Field>> = {
  EMAIL_ALREADY_REGISTERED: "email",
  EMPLOYEE_NUMBER_ALREADY_REGISTERED: "employee_number",
};

const brokenRulesSchema = z.object({ rules: z.array(passwordRuleSchema) });

function toPayload(values: RegisterFormOutput): RegisterPayload {
  return {
    ...values,
    maternal_surname: values.maternal_surname || null,
    employee_number: values.employee_number || null,
  };
}

function RegisterFormFields({ policy }: { policy: PasswordPolicy }) {
  const registerMutation = useRegister();
  const schema = useMemo(() => registerFormSchema(policy), [policy]);
  const form = useForm<RegisterFormValues, unknown, RegisterFormOutput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
      first_names: "",
      paternal_surname: "",
      maternal_surname: "",
      employee_number: "",
    },
  });
  const { errors } = form.formState;
  const password = useWatch({ control: form.control, name: "password" });

  const showServerError = (error: unknown) => {
    const setFieldError = (field: Field, message: string) => form.setError(field, { message });
    if (!(error instanceof ApiError)) {
      return;
    }
    const field = FIELD_BY_ERROR_CODE[error.code];
    if (field) {
      setFieldError(field, error.message);
      return;
    }
    const broken = brokenRulesSchema.safeParse(error.details);
    if (broken.success) {
      const messages = broken.data.rules.map((rule) => describeRule(rule, policy));
      setFieldError("password", messages.join(" "));
      return;
    }
    applyServerFieldErrors(error, FIELDS, setFieldError);
  };

  const onSubmit = form.handleSubmit((values) => {
    registerMutation.mutate(toPayload(values), { onError: showServerError });
  });

  const fieldError = registerMutation.error instanceof ApiError ? registerMutation.error : null;
  const handledByField =
    fieldError !== null &&
    (fieldError.code in FIELD_BY_ERROR_CODE ||
      brokenRulesSchema.safeParse(fieldError.details).success);

  const generalError =
    registerMutation.isError && !handledByField ? toUserMessage(registerMutation.error) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-(--field-gap)">
      <FormRequiredNote />
      {generalError ? (
        <Alert tone="danger" announce>
          {generalError}
        </Alert>
      ) : null}
      <Field
        id="first_names"
        label={texts.fields.firstNames}
        required
        error={errors.first_names?.message}
      >
        <Input autoComplete="given-name" {...form.register("first_names")} />
      </Field>
      <Field
        id="paternal_surname"
        label={texts.fields.paternalSurname}
        required
        error={errors.paternal_surname?.message}
      >
        <Input autoComplete="family-name" {...form.register("paternal_surname")} />
      </Field>
      <Field
        id="maternal_surname"
        label={texts.fields.maternalSurname}
        hint={texts.hints.maternalSurname}
        error={errors.maternal_surname?.message}
      >
        <Input autoComplete="additional-name" {...form.register("maternal_surname")} />
      </Field>
      <Field
        id="employee_number"
        label={texts.fields.employeeNumber}
        hint={texts.hints.employeeNumber}
        error={errors.employee_number?.message}
      >
        <Input {...form.register("employee_number")} />
      </Field>
      <Field
        id="email"
        label={texts.fields.email}
        hint={texts.hints.email}
        required
        error={errors.email?.message}
      >
        <Input type="email" autoComplete="email" {...form.register("email")} />
      </Field>
      <Field id="password" label={texts.fields.password} required error={errors.password?.message}>
        <Input
          type="password"
          autoComplete="new-password"
          aria-describedby="password-requisitos"
          {...form.register("password")}
        />
      </Field>
      <PasswordRequirements id="password-requisitos" policy={policy} password={password} />
      <Button
        type="submit"
        size="lg"
        loading={registerMutation.isPending}
        loadingLabel={texts.register.submitting}
      >
        {texts.register.submit}
      </Button>
    </form>
  );
}

/** Los requisitos de la contraseña vienen del backend: el formulario espera a conocerlos. */
export function RegisterForm() {
  const policy = usePasswordPolicy();

  if (policy.isPending) {
    return (
      <div className="grid gap-(--field-gap)" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="grid gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-(--control-height-md) w-full" />
          </div>
        ))}
        <p className="sr-only">{texts.passwordRequirements.loading}</p>
      </div>
    );
  }
  if (policy.isError) {
    return (
      <Alert tone="danger" announce>
        {toUserMessage(policy.error)}
      </Alert>
    );
  }
  return <RegisterFormFields policy={policy.data} />;
}
