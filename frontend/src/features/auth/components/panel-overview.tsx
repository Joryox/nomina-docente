"use client";

import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";

import { useSession } from "../hooks/use-session";
import { FormAlert } from "./form-alert";
import { LogoutButton } from "./logout-button";

const texts = TEXTS.auth.panel;

/** Panel provisional: confirma la sesión y permite cerrarla. Lo sustituye la etapa 6. */
export function PanelOverview() {
  const session = useSession();

  return (
    <section aria-labelledby="panel-title" className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-5">
        <div>
          <h1 id="panel-title" className="text-xl font-semibold text-foreground">
            {texts.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{texts.provisional}</p>
        </div>
        <LogoutButton />
      </div>
      <div className="px-6 py-5" aria-live="polite" aria-busy={session.isPending}>
        {session.isPending ? (
          <p className="text-sm text-muted-foreground">{texts.loading}</p>
        ) : session.isError ? (
          <FormAlert message={toUserMessage(session.error)} />
        ) : (
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="sr-only">{texts.title}</dt>
              <dd className="text-base font-medium text-foreground">
                {texts.greeting(session.data.teacher?.full_name ?? session.data.account.email)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t pt-3">
              <dt className="text-muted-foreground">{texts.account}</dt>
              <dd className="font-medium text-foreground">{session.data.account.email}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t pt-3">
              <dt className="text-muted-foreground">{texts.employeeNumber}</dt>
              <dd className="font-medium text-foreground">
                {session.data.teacher?.employee_number ?? texts.notCaptured}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
