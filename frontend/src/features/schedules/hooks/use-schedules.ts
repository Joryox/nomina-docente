import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateAfter } from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";

import {
  createSchedule,
  deleteSchedule,
  getWeeklySchedule,
  listAssignmentSchedules,
  updateSchedule,
} from "../api/schedules";
import type { ScheduleChanges, SchedulePayload } from "../types/schedules";

/** Horario de la semana agrupado por día, listo para la vista semanal. */
export function useWeeklySchedule() {
  return useQuery({
    queryKey: queryKeys.schedules.weekly,
    queryFn: ({ signal }) => getWeeklySchedule(signal),
  });
}

export function useAssignmentSchedules(assignmentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.schedules.byAssignment(assignmentId ?? ""),
    queryFn: ({ signal }) => listAssignmentSchedules(assignmentId ?? "", signal),
    enabled: Boolean(assignmentId),
  });
}

function useScheduleMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateAfter(queryClient, "schedules"),
  });
}

export function useCreateSchedule() {
  return useScheduleMutation(
    ({ assignmentId, schedule }: { assignmentId: string; schedule: SchedulePayload }) =>
      createSchedule(assignmentId, schedule),
  );
}

export function useUpdateSchedule() {
  return useScheduleMutation(({ id, changes }: { id: string; changes: ScheduleChanges }) =>
    updateSchedule(id, changes),
  );
}

export function useDeleteSchedule() {
  return useScheduleMutation(deleteSchedule);
}
