"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";

import { useSession } from "../hooks/use-session";

const texts = TEXTS.auth.panel;

/** Panel provisional: confirma la sesión. Lo sustituye el panel principal de la etapa 6. */
export function PanelOverview() {
  const session = useSession();

  return (
    <>
      <PageHeader title={texts.title} description={texts.provisional} />
      <Card className="max-w-form" aria-labelledby="panel-cuenta">
        <CardHeader>
          <CardTitle id="panel-cuenta">{texts.account}</CardTitle>
        </CardHeader>
        <CardContent aria-live="polite" aria-busy={session.isPending}>
          {session.isPending ? (
            <div className="grid gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <p className="sr-only">{texts.loading}</p>
            </div>
          ) : session.isError ? (
            <Alert tone="danger" announce>
              {toUserMessage(session.error)}
            </Alert>
          ) : (
            <dl className="grid gap-3 text-body">
              <div>
                <dt className="sr-only">{texts.title}</dt>
                <dd className="text-label font-semibold text-fg">
                  {texts.greeting(session.data.teacher?.full_name ?? session.data.account.email)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="text-fg-muted">{TEXTS.auth.fields.email}</dt>
                <dd className="font-medium text-fg">{session.data.account.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="text-fg-muted">{texts.employeeNumber}</dt>
                <dd className="font-medium text-fg">
                  {session.data.teacher?.employee_number ?? texts.notCaptured}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </>
  );
}
