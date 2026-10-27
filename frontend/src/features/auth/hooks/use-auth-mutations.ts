import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { APP_ROUTES } from "@/constants/routes";
import { setSessionClosedOnPurpose } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { changePassword, login, logout, logoutAll, register, updateProfile } from "../api/auth";
import type { Me } from "../types/auth";

function useEnterPanel() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (me: Me, nextPath: string) => {
    setSessionClosedOnPurpose(false);
    queryClient.setQueryData(queryKeys.auth.me, me);
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

/**
 * Sale del panel con una navegación completa: Next.js conserva ocultas las páginas visitadas
 * para volver rápido, y tras cerrar sesión no debe quedar en memoria nada del docente.
 */
function useLeavePanel() {
  const queryClient = useQueryClient();
  return () => {
    setSessionClosedOnPurpose(true);
    queryClient.clear();
    window.location.replace(APP_ROUTES.login);
  };
}

/** Cierra la sesión y olvida todos los datos en caché del docente. */
export function useLogout() {
  const leavePanel = useLeavePanel();
  return useMutation({ mutationFn: logout, onSettled: leavePanel });
}

/** Cierra todas las sesiones de la cuenta, incluida esta, y vuelve a iniciar sesión. */
export function useLogoutAll() {
  const leavePanel = useLeavePanel();
  return useMutation({ mutationFn: logoutAll, onSuccess: leavePanel });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (me) => queryClient.setQueryData(queryKeys.auth.me, me),
  });
}

/** Cambia la contraseña; el servidor cierra las demás sesiones y conserva esta. */
export function useChangePassword() {
  return useMutation({ mutationFn: changePassword });
}
