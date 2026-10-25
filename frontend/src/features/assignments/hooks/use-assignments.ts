import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateAfter } from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";

import {
  createAssignment,
  deactivateAssignment,
  deleteAssignment,
  getAssignment,
  listAssignments,
  reactivateAssignment,
  updateAssignment,
} from "../api/assignments";
import type { AssignmentChanges, AssignmentListParams } from "../types/assignments";

export function useAssignments(params: AssignmentListParams = {}) {
  return useQuery({
    queryKey: queryKeys.assignments.list(params),
    queryFn: ({ signal }) => listAssignments(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAssignment(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.assignments.detail(id ?? ""),
    queryFn: ({ signal }) => getAssignment(id ?? "", signal),
    enabled: Boolean(id),
  });
}

function useAssignmentMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateAfter(queryClient, "assignments"),
  });
}

export function useCreateAssignment() {
  return useAssignmentMutation(createAssignment);
}

export function useUpdateAssignment() {
  return useAssignmentMutation(({ id, changes }: { id: string; changes: AssignmentChanges }) =>
    updateAssignment(id, changes),
  );
}

export function useDeactivateAssignment() {
  return useAssignmentMutation(deactivateAssignment);
}

export function useReactivateAssignment() {
  return useAssignmentMutation(reactivateAssignment);
}

export function useDeleteAssignment() {
  return useAssignmentMutation(deleteAssignment);
}
