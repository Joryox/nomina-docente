import { API_ROUTES } from "@/constants/routes";
import { apiClient } from "@/lib/api-client";
import { withQuery } from "@/lib/api-paths";
import { noContentSchema } from "@/lib/api-schemas";

import { assignmentPageSchema, assignmentSchema } from "../schemas/assignments";
import type {
  Assignment,
  AssignmentChanges,
  AssignmentListParams,
  AssignmentPage,
  AssignmentPayload,
} from "../types/assignments";

const routes = API_ROUTES.assignments;

export function listAssignments(
  params: AssignmentListParams,
  signal?: AbortSignal,
): Promise<AssignmentPage> {
  return apiClient.get(withQuery(routes.collection, { ...params }), assignmentPageSchema, {
    signal,
  });
}

export function getAssignment(id: string, signal?: AbortSignal): Promise<Assignment> {
  return apiClient.get(routes.item(id), assignmentSchema, { signal });
}

export function createAssignment(body: AssignmentPayload): Promise<Assignment> {
  return apiClient.post(routes.collection, assignmentSchema, { body });
}

export function updateAssignment(id: string, body: AssignmentChanges): Promise<Assignment> {
  return apiClient.patch(routes.item(id), assignmentSchema, { body });
}

export function deactivateAssignment(id: string): Promise<Assignment> {
  return apiClient.post(routes.deactivate(id), assignmentSchema);
}

export function reactivateAssignment(id: string): Promise<Assignment> {
  return apiClient.post(routes.reactivate(id), assignmentSchema);
}

/** Solo si no tiene bitácora (RN-15); si la tiene, responde ASSIGNMENT_HAS_LOGBOOK. */
export async function deleteAssignment(id: string): Promise<void> {
  await apiClient.delete(routes.item(id), noContentSchema);
}
