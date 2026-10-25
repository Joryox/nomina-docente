"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { APP_ROUTES, NEXT_PATH_PARAM } from "@/constants/routes";
import { onSessionExpired } from "@/lib/api-client";

/**
 * Si la sesión ya no se puede renovar, olvida los datos en caché y lleva a iniciar sesión,
 * recordando la página actual para volver a ella.
 */
export function SessionExpiryHandler() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(
    () =>
      onSessionExpired(() => {
        queryClient.clear();
        const params = new URLSearchParams({ [NEXT_PATH_PARAM]: pathname });
        router.replace(`${APP_ROUTES.login}?${params.toString()}`);
      }),
    [queryClient, router, pathname],
  );

  return null;
}
