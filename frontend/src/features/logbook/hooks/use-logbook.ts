import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateAfter } from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";

import {
  createLogbookEntry,
  deleteLogbookEntry,
  getLogbookEntry,
  getScheduledClasses,
  listLogbook,
  quickRegister,
  updateLogbookEntry,
} from "../api/logbook";
import type { LogbookEntryChanges, LogbookListParams } from "../types/logbook";

export function useLogbook(params: LogbookListParams = {}) {
  return useQuery({
    queryKey: queryKeys.logbook.list(params),
    queryFn: ({ signal }) => listLogbook(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useLogbookEntry(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.logbook.detail(id ?? ""),
    queryFn: ({ signal }) => getLogbookEntry(id ?? "", signal),
    enabled: Boolean(id),
  });
}

/** Clases programadas para la fecha elegida (precarga del formulario, RN-21). */
export function useScheduledClasses(date: string | undefined) {
  return useQuery({
    queryKey: queryKeys.logbook.scheduled(date ?? ""),
    queryFn: ({ signal }) => getScheduledClasses(date ?? "", signal),
    enabled: Boolean(date),
  });
}

function useLogbookMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateAfter(queryClient, "logbook"),
  });
}

export function useCreateLogbookEntry() {
  return useLogbookMutation(createLogbookEntry);
}

export function useUpdateLogbookEntry() {
  return useLogbookMutation(({ id, changes }: { id: string; changes: LogbookEntryChanges }) =>
    updateLogbookEntry(id, changes),
  );
}

export function useDeleteLogbookEntry() {
  return useLogbookMutation(deleteLogbookEntry);
}

export function useQuickRegister() {
  return useLogbookMutation(quickRegister);
}
