"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FormRequiredNote } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";

import { useRegister } from "../hooks/use-auth-mutations";
import { usePasswordPolicy } from "../hooks/use-password-policy";
import {
  registerFormSchema,
  type RegisterFormOutput,
  type RegisterFormValues,
} from "../schemas/forms";
import type { PasswordPolicy, RegisterPayload } from "../types/auth";
import { FormGroup } from "./form-group";
import { PasswordPolicyFallback } from "./password-policy-fallback";
import { PasswordRequirements } from "./password-requirements";
import { useAccountErrorHandler } from "../hooks/use-account-error-handler";

const texts = TEXTS.auth;
const FIELDS = [
  "email",
  "password",
  "first_names",
  "paternal_surname",
  "maternal_surname",
  "employee_number",
] as const;

function toPayload(values: RegisterFormOutput): RegisterPayload {
  return {
    email: values.email,
    password: values.password,
    first_names: values.first_names,
    paternal_surname: values.paternal_surname,
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
      first_names: "",
      paternal_surname: "",
      maternal_surname: "",
      employee_number: "",
      email: "",
      password: "",
      password_confirmation: "",
    },
  });
  const { errors } = form.formState;
  const [password, firstNames, paternal, maternal, email] = useWatch({
    control: form.control,
    name: ["password", "first_names", "paternal_surname", "maternal_surname", "email"],
  });
  const { handleError, isGeneral } = useAccountErrorHandler(
    policy,
    {
      fields: FIELDS,
      byCode: {
        EMAIL_ALREADY_REGISTERED: "email",
        EMPLOYEE_NUMBER_ALREADY_REGISTERED: "employee_number",
      },
      passwordField: "password",
    },
    (field, message) => form.setError(field, { message }),
  );
  const busy = registerMutation.isPending || registerMutation.isSuccess;

  const onSubmit = form.handleSubmit((values) => {
    if (busy) {
      return;
    }
    registerMutation.mutate(toPayload(values), { onError: handleError });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-(--section-gap)">
      <div className="grid gap-3">
        <FormRequiredNote />
        {isGeneral(registerMutation.error) ? (
          <Alert tone="danger" announce>
            {toUserMessage(registerMutation.error)}
          </Alert>
        ) : null}
      </div>

      <FormGroup title={texts.register.personalGroup} hint={texts.register.personalGroupHint}>
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
          optional
          hint={texts.hints.maternalSurname}
          error={errors.maternal_surname?.message}
        >
          <Input autoComplete="additional-name" {...form.register("maternal_surname")} />
        </Field>
        <Field
          id="employee_number"
          label={texts.fields.employeeNumber}
          optional
          hint={texts.hints.employeeNumber}
          error={errors.employee_number?.message}
        >
          <Input autoComplete="off" spellCheck={false} {...form.register("employee_number")} />
        </Field>
      </FormGroup>

      <FormGroup title={texts.register.accessGroup} hint={texts.register.accessGroupHint}>
        <Field
          id="email"
          label={texts.fields.email}
          hint={texts.hints.email}
          required
          error={errors.email?.message}
        >
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            {...form.register("email")}
          />
        </Field>
        <Field
          id="password"
          label={texts.fields.password}
          required
          error={errors.password?.message}
        >
          <PasswordInput
            autoComplete="new-password"
            aria-describedby="password-requisitos"
            {...form.register("password")}
          />
        </Field>
        <PasswordRequirements
          id="password-requisitos"
          policy={policy}
          password={password}
          personalData={[firstNames, paternal, maternal ?? "", email]}
        />
        <Field
          id="password_confirmation"
          label={texts.fields.passwordConfirmation}
          required
          error={errors.password_confirmation?.message}
        >
          <PasswordInput autoComplete="new-password" {...form.register("password_confirmation")} />
        </Field>
      </FormGroup>

      <Button type="submit" size="lg" loading={busy} loadingLabel={texts.register.submitting}>
        {texts.register.submit}
      </Button>
    </form>
  );
}

/** Los requisitos de la contraseña vienen del backend: el formulario espera a conocerlos. */
export function RegisterForm() {
  const policy = usePasswordPolicy();
  if (!policy.data) {
    return <PasswordPolicyFallback query={policy} fields={6} />;
  }
  return <RegisterFormFields policy={policy.data} />;
}
