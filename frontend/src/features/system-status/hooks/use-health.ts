import { useQuery } from "@tanstack/react-query";

import { getHealth } from "../api/get-health";

export const healthQueryKey = ["system-status", "health"] as const;

export function useHealth() {
  return useQuery({
    queryKey: healthQueryKey,
    queryFn: ({ signal }) => getHealth(signal),
  });
}
