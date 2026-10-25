import { API_ROUTES } from "@/constants/routes";
import { apiClient } from "@/lib/api-client";
import { withQuery } from "@/lib/api-paths";

import { subjectPageSchema, subjectRemovalSchema, subjectSchema } from "../schemas/subjects";
import type {
  Subject,
  SubjectChanges,
  SubjectListParams,
  SubjectPage,
  SubjectPayload,
  SubjectRemoval,
} from "../types/subjects";

const routes = API_ROUTES.subjects;

export function listSubjects(
  params: SubjectListParams,
  signal?: AbortSignal,
): Promise<SubjectPage> {
  return apiClient.get(withQuery(routes.collection, { ...params }), subjectPageSchema, { signal });
}

export function getSubject(id: string, signal?: AbortSignal): Promise<Subject> {
  return apiClient.get(routes.item(id), subjectSchema, { signal });
}

export function createSubject(body: SubjectPayload): Promise<Subject> {
  return apiClient.post(routes.collection, subjectSchema, { body });
}

export function updateSubject(id: string, body: SubjectChanges): Promise<Subject> {
  return apiClient.patch(routes.item(id), subjectSchema, { body });
}

/** Borra la materia si nunca se usó; si tiene historial, la desactiva (ver `outcome`). */
export function removeSubject(id: string): Promise<SubjectRemoval> {
  return apiClient.delete(routes.item(id), subjectRemovalSchema);
}

export function reactivateSubject(id: string): Promise<Subject> {
  return apiClient.post(routes.reactivate(id), subjectSchema);
}
