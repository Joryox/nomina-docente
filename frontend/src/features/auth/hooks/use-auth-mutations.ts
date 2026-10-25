import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { APP_ROUTES } from "@/constants/routes";

import { login, logout, register } from "../api/auth";
import type { Me } from "../types/auth";
import { authQueryKeys } from "./query-keys";

function useEnterPanel() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (me: Me, nextPath: string) => {
    queryClient.setQueryData(authQueryKeys.me, me);
    router.replace(nextPath);
  };
}

export function useLogin(nextPath: string) {
  const enterPanel = useEnterPanel();
  return useMutation({ mutationFn: login, onSuccess: (me) => enterPanel(me, nextPath) });
}

export function useRegister() {
  const enterPanel = useEnterPanel();
  return useMutation({
    mutationFn: register,
    onSuccess: (me) => enterPanel(me, APP_ROUTES.panel),
  });
}

/** Cierra la sesión y olvida todos los datos en caché del docente. */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
      router.replace(APP_ROUTES.login);
    },
  });
}
