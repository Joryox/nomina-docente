import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import { getDashboardSummary } from "../api/dashboard";

/** Resumen del panel: quincena actual, clases de hoy, pendientes y últimos recibos. */
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: ({ signal }) => getDashboardSummary(signal),
  });
}
