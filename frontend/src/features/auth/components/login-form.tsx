"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { APP_ROUTES, NEXT_PATH_PARAM } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";
import { applyServerFieldErrors } from "@/lib/form-errors";
import { safeInternalPath } from "@/lib/navigation";

import { useLogin } from "../hooks/use-auth-mutations";
import { loginFormSchema, type LoginFormValues, type LoginPayload } from "../schemas/forms";
import { FormAlert } from "./form-alert";
import { FormField } from "./form-field";

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
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <FormAlert message={loginMutation.isError ? toUserMessage(loginMutation.error) : null} />
      <FormField
        id="email"
        type="email"
        autoComplete="username"
        label={texts.fields.email}
        error={errors.email?.message}
        {...form.register("email")}
      />
      <FormField
        id="password"
        type="password"
        autoComplete="current-password"
        label={texts.fields.password}
        error={errors.password?.message}
        {...form.register("password")}
      />
      <Button type="submit" disabled={loginMutation.isPending} aria-busy={loginMutation.isPending}>
        {loginMutation.isPending ? texts.login.submitting : texts.login.submit}
      </Button>
    </form>
  );
}
