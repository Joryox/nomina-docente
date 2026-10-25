import { API_MAX_PAGE_SIZE } from "@/constants/query";
import { API_ROUTES } from "@/constants/routes";
import { apiClient } from "@/lib/api-client";
import { withQuery } from "@/lib/api-paths";

import { businessRulesSchema, careerPageSchema, hourlyRatePageSchema } from "../schemas/catalogs";
import type { BusinessRules, Career, HourlyRate } from "../types/catalogs";

// Los catálogos alimentan selectores: se piden completos en una sola página.
const allItems = { page_size: API_MAX_PAGE_SIZE };

export async function getCareers(signal?: AbortSignal): Promise<Career[]> {
  const page = await apiClient.get(
    withQuery(API_ROUTES.catalogs.careers, allItems),
    careerPageSchema,
    {
      signal,
    },
  );
  return page.items;
}

export async function getHourlyRates(signal?: AbortSignal): Promise<HourlyRate[]> {
  const page = await apiClient.get(
    withQuery(API_ROUTES.catalogs.hourlyRates, allItems),
    hourlyRatePageSchema,
    { signal },
  );
  return page.items;
}

export function getBusinessRules(signal?: AbortSignal): Promise<BusinessRules> {
  return apiClient.get(API_ROUTES.catalogs.businessRules, businessRulesSchema, { signal });
}
