"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
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
import { FormAlert } from "./form-alert";
import { FormField } from "./form-field";
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

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormAlert
        message={
          registerMutation.isError && !handledByField ? toUserMessage(registerMutation.error) : null
        }
      />
      <FormField
        id="first_names"
        autoComplete="given-name"
        label={texts.fields.firstNames}
        error={errors.first_names?.message}
        {...form.register("first_names")}
      />
      <FormField
        id="paternal_surname"
        autoComplete="family-name"
        label={texts.fields.paternalSurname}
        error={errors.paternal_surname?.message}
        {...form.register("paternal_surname")}
      />
      <FormField
        id="maternal_surname"
        autoComplete="additional-name"
        label={texts.fields.maternalSurname}
        optionalLabel={texts.fields.optional}
        hint={texts.hints.maternalSurname}
        error={errors.maternal_surname?.message}
        {...form.register("maternal_surname")}
      />
      <FormField
        id="employee_number"
        label={texts.fields.employeeNumber}
        optionalLabel={texts.fields.optional}
        hint={texts.hints.employeeNumber}
        error={errors.employee_number?.message}
        {...form.register("employee_number")}
      />
      <FormField
        id="email"
        type="email"
        autoComplete="email"
        label={texts.fields.email}
        hint={texts.hints.email}
        error={errors.email?.message}
        {...form.register("email")}
      />
      <div className="grid gap-2">
        <FormField
          id="password"
          type="password"
          autoComplete="new-password"
          label={texts.fields.password}
          error={errors.password?.message}
          aria-describedby="password-requisitos"
          {...form.register("password")}
        />
        <PasswordRequirements id="password-requisitos" policy={policy} password={password} />
      </div>
      <Button
        type="submit"
        disabled={registerMutation.isPending}
        aria-busy={registerMutation.isPending}
      >
        {registerMutation.isPending ? texts.register.submitting : texts.register.submit}
      </Button>
    </form>
  );
}

/** Los requisitos de la contraseña vienen del backend: el formulario espera a conocerlos. */
export function RegisterForm() {
  const policy = usePasswordPolicy();

  if (policy.isPending) {
    return <p className="text-sm text-muted-foreground">{texts.passwordRequirements.loading}</p>;
  }
  if (policy.isError) {
    return <FormAlert message={toUserMessage(policy.error)} />;
  }
  return <RegisterFormFields policy={policy.data} />;
}
