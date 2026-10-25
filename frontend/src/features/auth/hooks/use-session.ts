import { useQuery } from "@tanstack/react-query";

import { getMe } from "../api/auth";
import { authQueryKeys } from "./query-keys";

/** Cuenta y perfil del docente con sesión. Un 401 (sin sesión) no se reintenta. */
export function useSession() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: ({ signal }) => getMe(signal),
    retry: false,
  });
}
