import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateAfter } from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";

import {
  createSubject,
  getSubject,
  listSubjects,
  reactivateSubject,
  removeSubject,
  updateSubject,
} from "../api/subjects";
import type { SubjectChanges, SubjectListParams } from "../types/subjects";

export function useSubjects(params: SubjectListParams = {}) {
  return useQuery({
    queryKey: queryKeys.subjects.list(params),
    queryFn: ({ signal }) => listSubjects(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.subjects.detail(id ?? ""),
    queryFn: ({ signal }) => getSubject(id ?? "", signal),
    enabled: Boolean(id),
  });
}

function useSubjectMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateAfter(queryClient, "subjects"),
  });
}

export function useCreateSubject() {
  return useSubjectMutation(createSubject);
}

export function useUpdateSubject() {
  return useSubjectMutation(({ id, changes }: { id: string; changes: SubjectChanges }) =>
    updateSubject(id, changes),
  );
}

export function useRemoveSubject() {
  return useSubjectMutation(removeSubject);
}

export function useReactivateSubject() {
  return useSubjectMutation(reactivateSubject);
}
