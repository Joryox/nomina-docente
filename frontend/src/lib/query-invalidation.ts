import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { queryKeys } from "./query-keys";

/** Qué tipo de dato cambió tras una mutación. */
export type DataChange = "subjects" | "assignments" | "schedules" | "logbook" | "receipts";

/**
 * Consultas que quedan desactualizadas con cada cambio. Un dato aparece dentro de otros
 * recursos (el nombre de la materia en la bitácora, la tarifa en la vista previa), así que
 * se invalidan todas las vistas que lo muestran.
 */
const AFFECTED: Readonly<Record<DataChange, readonly QueryKey[]>> = {
  subjects: [
    queryKeys.subjects.all,
    queryKeys.assignments.all,
    queryKeys.schedules.all,
    queryKeys.logbook.all,
    queryKeys.payroll.all,
    queryKeys.dashboard.all,
  ],
  assignments: [
    queryKeys.assignments.all,
    queryKeys.subjects.all,
    queryKeys.schedules.all,
    queryKeys.logbook.all,
    queryKeys.payroll.all,
    queryKeys.dashboard.all,
  ],
  schedules: [
    queryKeys.schedules.all,
    queryKeys.assignments.all,
    queryKeys.logbook.all,
    queryKeys.payroll.all,
    queryKeys.dashboard.all,
  ],
  logbook: [
    queryKeys.logbook.all,
    queryKeys.assignments.all,
    queryKeys.payroll.all,
    queryKeys.dashboard.all,
  ],
  receipts: [queryKeys.payroll.all, queryKeys.logbook.all, queryKeys.dashboard.all],
};

export async function invalidateAfter(queryClient: QueryClient, change: DataChange) {
  await Promise.all(
    AFFECTED[change].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
