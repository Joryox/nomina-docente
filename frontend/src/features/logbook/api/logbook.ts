import { API_ROUTES } from "@/constants/routes";
import { apiClient } from "@/lib/api-client";
import { withQuery } from "@/lib/api-paths";
import { noContentSchema } from "@/lib/api-schemas";

import {
  logbookEntryResultSchema,
  logbookEntrySchema,
  logbookPageSchema,
  quickLogbookResultSchema,
  scheduledClassesSchema,
} from "../schemas/logbook";
import type {
  LogbookEntry,
  LogbookEntryChanges,
  LogbookEntryPayload,
  LogbookEntryResult,
  LogbookListParams,
  LogbookPage,
  QuickLogbookPayload,
  QuickLogbookResult,
  ScheduledClasses,
} from "../types/logbook";

const routes = API_ROUTES.logbook;

export function listLogbook(params: LogbookListParams, signal?: AbortSignal): Promise<LogbookPage> {
  return apiClient.get(withQuery(routes.collection, { ...params }), logbookPageSchema, { signal });
}

export function getLogbookEntry(id: string, signal?: AbortSignal): Promise<LogbookEntry> {
  return apiClient.get(routes.item(id), logbookEntrySchema, { signal });
}

/** Clases del horario para una fecha, con horas precargadas y si ya están registradas. */
export function getScheduledClasses(date: string, signal?: AbortSignal): Promise<ScheduledClasses> {
  return apiClient.get(withQuery(routes.scheduled, { date }), scheduledClassesSchema, { signal });
}

export function createLogbookEntry(body: LogbookEntryPayload): Promise<LogbookEntryResult> {
  return apiClient.post(routes.collection, logbookEntryResultSchema, { body });
}

export function updateLogbookEntry(
  id: string,
  body: LogbookEntryChanges,
): Promise<LogbookEntryResult> {
  return apiClient.patch(routes.item(id), logbookEntryResultSchema, { body });
}

export async function deleteLogbookEntry(id: string): Promise<void> {
  await apiClient.delete(routes.item(id), noContentSchema);
}

/** Registra varias clases en una transacción: si una falla, no se registra ninguna. */
export function quickRegister(body: QuickLogbookPayload): Promise<QuickLogbookResult> {
  return apiClient.post(routes.quick, quickLogbookResultSchema, { body });
}
