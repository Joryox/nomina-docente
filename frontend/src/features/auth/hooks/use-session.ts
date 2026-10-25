import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { getMe } from "../api/auth";

/** Cuenta y perfil del docente con sesión. Un 401 (sin sesión) no se reintenta. */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: ({ signal }) => getMe(signal),
    retry: false,
  });
}
