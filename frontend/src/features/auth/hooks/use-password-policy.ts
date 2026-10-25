import { useQuery } from "@tanstack/react-query";

import { getPasswordPolicy } from "../api/auth";
import { authQueryKeys } from "./query-keys";

/** Política de contraseñas del backend; no cambia mientras la página está abierta. */
export function usePasswordPolicy() {
  return useQuery({
    queryKey: authQueryKeys.passwordPolicy,
    queryFn: ({ signal }) => getPasswordPolicy(signal),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
