"use client";

import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { useHydrated } from "@/lib/use-hydrated";

import { useLogout } from "../hooks/use-auth-mutations";
import { useSession } from "../hooks/use-session";
import { SessionExpiryHandler } from "./session-expiry-handler";

/** AppShell con los datos de la sesión: nombre del docente y cierre de sesión. */
export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const logout = useLogout();
  const hydrated = useHydrated();
  const user =
    hydrated && session.data
      ? {
          name: session.data.teacher?.full_name ?? session.data.account.email,
          email: session.data.account.email,
        }
      : null;

  return (
    <>
      <SessionExpiryHandler />
      <AppShell user={user} onLogout={() => logout.mutate()} loggingOut={logout.isPending}>
        {children}
      </AppShell>
    </>
  );
}
