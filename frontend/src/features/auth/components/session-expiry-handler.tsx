"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { APP_ROUTES, NEXT_PATH_PARAM } from "@/constants/routes";
import { onSessionExpired } from "@/lib/api-client";

/**
 * Si la sesión ya no se puede renovar, olvida los datos en caché y lleva a iniciar sesión,
 * recordando la página actual para volver a ella. La navegación es completa para que no
 * queden en memoria las páginas que Next.js conserva ocultas.
 */
export function SessionExpiryHandler() {
  const queryClient = useQueryClient();
  const pathname = usePathname();

  useEffect(
    () =>
      onSessionExpired(() => {
        queryClient.clear();
        const params = new URLSearchParams({ [NEXT_PATH_PARAM]: pathname });
        window.location.replace(`${APP_ROUTES.login}?${params.toString()}`);
      }),
    [queryClient, pathname],
  );

  return null;
}
