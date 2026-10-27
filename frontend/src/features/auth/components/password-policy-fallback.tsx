import type { UseQueryResult } from "@tanstack/react-query";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TEXTS } from "@/constants/texts";

import type { PasswordPolicy } from "../types/auth";

/** Lo que se muestra mientras llega la política de contraseñas, o si no se pudo cargar. */
export function PasswordPolicyFallback({
  query,
  fields,
}: {
  query: UseQueryResult<PasswordPolicy>;
  fields: number;
}) {
  if (query.isError) {
    return (
      <Alert
        tone="danger"
        announce
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {TEXTS.ui.retry}
          </Button>
        }
      >
        {TEXTS.auth.passwordRequirements.policyError}
      </Alert>
    );
  }
  return (
    <div className="grid gap-(--field-gap)" aria-busy="true">
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="grid gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-(--control-height-md) w-full" />
        </div>
      ))}
      <p className="sr-only">{TEXTS.auth.passwordRequirements.loading}</p>
    </div>
  );
}
