import { QueryClient } from "@tanstack/react-query";

import { QUERY_MAX_RETRIES, QUERY_STALE_TIME_MS } from "@/constants/query";

import { ApiError } from "./api-error";

function shouldRetry(failureCount: number, error: Error): boolean {
  // Los errores 4xx son definitivos: reintentar no cambia la respuesta.
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < QUERY_MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
