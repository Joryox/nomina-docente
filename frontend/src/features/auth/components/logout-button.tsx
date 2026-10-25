"use client";

import { Button } from "@/components/ui/button";
import { TEXTS } from "@/constants/texts";

import { useLogout } from "../hooks/use-auth-mutations";

export function LogoutButton() {
  const logout = useLogout();
  return (
    <Button
      variant="outline"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      aria-busy={logout.isPending}
    >
      {logout.isPending ? TEXTS.auth.panel.loggingOut : TEXTS.auth.panel.logout}
    </Button>
  );
}
