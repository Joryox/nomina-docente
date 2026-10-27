"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { APP_ROUTES, NEXT_PATH_PARAM } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";
import { ApiError, toUserMessage } from "@/lib/api-error";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { safeInternalPath } from "@/lib/navigation";

import { useLogin } from "../hooks/use-auth-mutations";
import { loginFormSchema, type LoginFormValues, type LoginPayload } from "../schemas/forms";
import { LockoutNotice } from "./lockout-notice";

const texts = TEXTS.auth;
const FIELDS = ["email", "password"] as const;

const lockoutDetailsSchema = z.object({ retry_after_seconds: z.number().int().nonnegative() });

/** Segundos de bloqueo si el error es ACCOUNT_LOCKED con su detalle; si no, `null`. */
function lockoutSeconds(error: unknown): number | null {
  if (!(error instanceof ApiError) || !error.is("ACCOUNT_LOCKED")) {
    return null;
  }
  return lockoutDetailsSchema.safeParse(error.details).data?.retry_after_seconds ?? null;
}

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
  // Tras entrar, el botón sigue ocupado hasta que cambia la página: evita un segundo envío.
  const busy = loginMutation.isPending || loginMutation.isSuccess;
  const lockedFor = lockoutSeconds(loginMutation.error);

  const onSubmit = form.handleSubmit((values) => {
    if (busy) {
      return;
    }
    loginMutation.mutate(values, {
      onError: (error) => {
        // Por seguridad la contraseña no se conserva tras un intento fallido.
        form.resetField("password");
        applyServerFieldErrors(error, FIELDS, (field, message) =>
          form.setError(field, { message }),
        );
      },
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-(--field-gap)">
      {lockedFor !== null ? (
        // La clave reinicia la cuenta regresiva con cada intento.
        <LockoutNotice key={loginMutation.submittedAt} seconds={lockedFor} />
      ) : loginMutation.isError ? (
        <Alert tone="danger" announce>
          {toUserMessage(loginMutation.error)}
        </Alert>
      ) : null}
      <Field id="email" label={texts.fields.email} error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          {...form.register("email")}
        />
      </Field>
      <Field id="password" label={texts.fields.password} error={errors.password?.message}>
        <PasswordInput autoComplete="current-password" {...form.register("password")} />
      </Field>
      <Button type="submit" size="lg" loading={busy} loadingLabel={texts.login.submitting}>
        {texts.login.submit}
      </Button>
    </form>
  );
}
