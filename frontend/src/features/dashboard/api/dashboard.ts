import { API_ROUTES } from "@/constants/routes";
import { apiClient } from "@/lib/api-client";

import { dashboardSummarySchema } from "../schemas/dashboard";
import type { DashboardSummary } from "../types/dashboard";

export function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  return apiClient.get(API_ROUTES.dashboard.summary, dashboardSummarySchema, { signal });
}
