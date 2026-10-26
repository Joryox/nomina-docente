"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { APP_ROUTES, NEXT_PATH_PARAM } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { safeInternalPath } from "@/lib/navigation";

import { useLogin } from "../hooks/use-auth-mutations";
import { loginFormSchema, type LoginFormValues, type LoginPayload } from "../schemas/forms";

const texts = TEXTS.auth;
const FIELDS = ["email", "password"] as const;

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = safeInternalPath(searchParams.get(NEXT_PATH_PARAM), APP_ROUTES.panel);
  const loginMutation = useLogin(nextPath);
  const form = useForm<LoginFormValues, unknown, LoginPayload>({
    resolver: zodResolver(loginFormSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    loginMutation.mutate(values, {
      onError: (error) => {
        applyServerFieldErrors(error, FIELDS, (field, message) =>
          form.setError(field, { message }),
        );
        // Por seguridad la contraseña no se conserva tras un intento fallido.
        form.resetField("password");
      },
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-(--field-gap)">
      {loginMutation.isError ? (
        <Alert tone="danger" announce>
          {toUserMessage(loginMutation.error)}
        </Alert>
      ) : null}
      <Field id="email" label={texts.fields.email} error={errors.email?.message}>
        <Input type="email" autoComplete="username" {...form.register("email")} />
      </Field>
      <Field id="password" label={texts.fields.password} error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
      <Button
        type="submit"
        size="lg"
        loading={loginMutation.isPending}
        loadingLabel={texts.login.submitting}
      >
        {texts.login.submit}
      </Button>
    </form>
  );
}
