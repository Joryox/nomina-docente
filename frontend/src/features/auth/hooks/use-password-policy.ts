import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { getPasswordPolicy } from "../api/auth";

/** Política de contraseñas del backend; no cambia mientras la página está abierta. */
export function usePasswordPolicy() {
  return useQuery({
    queryKey: queryKeys.auth.passwordPolicy,
    queryFn: ({ signal }) => getPasswordPolicy(signal),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
