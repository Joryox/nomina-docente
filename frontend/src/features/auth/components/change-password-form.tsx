"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";

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
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { PROFILE_PASSWORD_SECTION_ID } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";

import { useAccountErrorHandler } from "../hooks/use-account-error-handler";
import { useChangePassword } from "../hooks/use-auth-mutations";
import { usePasswordPolicy } from "../hooks/use-password-policy";
import {
  changePasswordFormSchema,
  type ChangePasswordFormOutput,
  type ChangePasswordFormValues,
} from "../schemas/forms";
import type { Me, PasswordPolicy } from "../types/auth";
import { PasswordPolicyFallback } from "./password-policy-fallback";
import { PasswordRequirements } from "./password-requirements";

const texts = TEXTS.profile.password;
const fields = TEXTS.auth.fields;
const FIELDS = ["current_password", "new_password"] as const;
const EMPTY: ChangePasswordFormValues = {
  current_password: "",
  new_password: "",
  new_password_confirmation: "",
};

function personalData(me: Me): string[] {
  const teacher = me.teacher;
  return [
    me.account.email,
    teacher?.first_names ?? "",
    teacher?.paternal_surname ?? "",
    teacher?.maternal_surname ?? "",
  ];
}

function ChangePasswordFields({ me, policy }: { me: Me; policy: PasswordPolicy }) {
  const change = useChangePassword();
  const schema = useMemo(() => changePasswordFormSchema(policy), [policy]);
  const form = useForm<ChangePasswordFormValues, unknown, ChangePasswordFormOutput>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;
  const [current, next] = useWatch({
    control: form.control,
    name: ["current_password", "new_password"],
  });
  const { handleError, isGeneral } = useAccountErrorHandler(
    policy,
    {
      fields: FIELDS,
      byCode: { CURRENT_PASSWORD_INCORRECT: "current_password" },
      passwordField: "new_password",
    },
    (field, message) => form.setError(field, { message }),
  );

  const onSubmit = form.handleSubmit(({ current_password, new_password }) => {
    if (change.isPending) {
      return;
    }
    change.mutate(
      { current_password, new_password },
      {
        onSuccess: () => form.reset(EMPTY),
        onError: (error) => {
          // Por seguridad la contraseña actual no se conserva tras un intento fallido.
          form.resetField("current_password");
          handleError(error);
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <CardContent className="grid gap-(--field-gap)">
        {change.isSuccess ? (
          <Alert tone="success" title={texts.changedTitle} announce>
            {texts.changedBody}
          </Alert>
        ) : null}
        {isGeneral(change.error) ? (
          <Alert tone="danger" announce>
            {toUserMessage(change.error)}
          </Alert>
        ) : null}
        <Field
          id="current_password"
          label={fields.currentPassword}
          required
          error={errors.current_password?.message}
        >
          <PasswordInput autoComplete="current-password" {...form.register("current_password")} />
        </Field>
        <Field
          id="new_password"
          label={fields.newPassword}
          required
          error={errors.new_password?.message}
        >
          <PasswordInput
            autoComplete="new-password"
            aria-describedby="contrasena-nueva-requisitos"
            {...form.register("new_password")}
          />
        </Field>
        <PasswordRequirements
          id="contrasena-nueva-requisitos"
          policy={policy}
          password={next}
          personalData={personalData(me)}
          currentPassword={current}
          showNotCurrent
        />
        <Field
          id="new_password_confirmation"
          label={fields.newPasswordConfirmation}
          required
          error={errors.new_password_confirmation?.message}
        >
          <PasswordInput
            autoComplete="new-password"
            {...form.register("new_password_confirmation")}
          />
        </Field>
      </CardContent>
      <CardFooter>
        <Button type="submit" loading={change.isPending} loadingLabel={texts.submitting}>
          {texts.submit}
        </Button>
      </CardFooter>
    </form>
  );
}

/** Cambio de contraseña con los requisitos del servidor revisados en vivo. */
export function ChangePasswordForm({ me }: { me: Me }) {
  const policy = usePasswordPolicy();
  return (
    <Card
      id={PROFILE_PASSWORD_SECTION_ID}
      aria-labelledby="perfil-contrasena"
      className="scroll-mt-(--topbar-height)"
    >
      <CardHeader>
        <div>
          <CardTitle id="perfil-contrasena">{texts.title}</CardTitle>
          <CardDescription>{texts.description}</CardDescription>
        </div>
      </CardHeader>
      {policy.data ? (
        <ChangePasswordFields me={me} policy={policy.data} />
      ) : (
        <CardContent>
          <PasswordPolicyFallback query={policy} fields={3} />
        </CardContent>
      )}
    </Card>
  );
}
