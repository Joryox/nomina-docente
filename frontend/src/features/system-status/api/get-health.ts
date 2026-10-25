import { API_ROUTES } from "@/constants/routes";
import { apiClient } from "@/lib/api-client";

import { healthResponseSchema } from "../schemas/health";
import type { HealthResponse } from "../types/health";

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiClient.get(API_ROUTES.health, healthResponseSchema, { signal });
}
