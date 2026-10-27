"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";
import { useHydrated } from "@/lib/use-hydrated";

import { useSession } from "../hooks/use-session";
import { AccountDetails } from "./account-details";
import { ChangePasswordForm } from "./change-password-form";
import { LogoutEverywhere } from "./logout-everywhere";
import { ProfileForm } from "./profile-form";

const texts = TEXTS.profile;

/** Mi perfil: datos personales, cuenta, contraseña y sesiones abiertas. */
export function ProfilePage() {
  const session = useSession();
  const hydrated = useHydrated();

  return (
    <>
      <PageHeader title={texts.title} description={texts.description} />
      {!hydrated || session.isPending ? (
        <ProfileSkeleton />
      ) : session.isError ? (
        <Alert
          tone="danger"
          announce
          className="max-w-form"
          action={
            <Button variant="outline" size="sm" onClick={() => void session.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(session.error)}
        </Alert>
      ) : (
        <div className="grid items-start gap-(--section-gap) lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid gap-(--section-gap)">
            <ProfileForm me={session.data} />
            <ChangePasswordForm me={session.data} />
          </div>
          <div className="grid gap-(--section-gap)">
            <AccountDetails me={session.data} />
            <LogoutEverywhere />
          </div>
        </div>
      )}
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid max-w-form gap-(--section-gap)" aria-busy="true">
      <p className="sr-only">{texts.loading}</p>
      {[0, 1].map((card) => (
        <Card key={card}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="grid gap-(--field-gap)">
            {[0, 1, 2].map((field) => (
              <div key={field} className="grid gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-(--control-height-md) w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
