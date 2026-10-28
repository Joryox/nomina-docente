import { useQuery } from "@tanstack/react-query";

import { CATALOG_STALE_TIME_MS } from "@/constants/query";
import { queryKeys } from "@/lib/query-keys";
import { shiftOf, type Shift } from "@/lib/shifts";

import { getBusinessRules, getCareers, getHourlyRates } from "../api/catalogs";

/** Carreras activas para el selector, ordenadas por nombre. */
export function useCareers() {
  return useQuery({
    queryKey: queryKeys.catalogs.careers,
    queryFn: ({ signal }) => getCareers(signal),
    staleTime: CATALOG_STALE_TIME_MS,
  });
}

/** Tarifas vigentes para el selector, de menor a mayor. */
export function useHourlyRates() {
  return useQuery({
    queryKey: queryKeys.catalogs.hourlyRates,
    queryFn: ({ signal }) => getHourlyRates(signal),
    staleTime: CATALOG_STALE_TIME_MS,
  });
}

/** Límites configurables del servidor y la fecha de hoy en la zona de la institución. */
export function useBusinessRules() {
  return useQuery({
    queryKey: queryKeys.catalogs.businessRules,
    queryFn: ({ signal }) => getBusinessRules(signal),
    staleTime: CATALOG_STALE_TIME_MS,
  });
}

/** Turno de una hora de entrada con el umbral del servidor; `null` mientras carga. */
export function useShiftOf(): (startTime: string) => Shift | null {
  const rules = useBusinessRules();
  const afternoonStart = rules.data?.afternoon_shift_start;
  return (startTime) => (afternoonStart ? shiftOf(startTime, afternoonStart) : null);
}
