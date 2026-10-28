import { z } from "zod";

import { API_ROUTES } from "@/constants/routes";
import { apiClient } from "@/lib/api-client";
import { noContentSchema, scheduleSchema } from "@/lib/api-schemas";

import { weeklyScheduleSchema } from "../schemas/schedules";
import type {
  Schedule,
  ScheduleBatchPayload,
  ScheduleChanges,
  WeeklySchedule,
} from "../types/schedules";

export function getWeeklySchedule(signal?: AbortSignal): Promise<WeeklySchedule> {
  return apiClient.get(API_ROUTES.schedules.weekly, weeklyScheduleSchema, { signal });
}

export function listAssignmentSchedules(
  assignmentId: string,
  signal?: AbortSignal,
): Promise<Schedule[]> {
  return apiClient.get(API_ROUTES.assignments.schedules(assignmentId), z.array(scheduleSchema), {
    signal,
  });
}

/** Varios días y rangos en una sola transacción: el servidor guarda todos o ninguno. */
export function createSchedules(
  assignmentId: string,
  body: ScheduleBatchPayload,
): Promise<Schedule[]> {
  return apiClient.post(
    API_ROUTES.assignments.schedulesBatch(assignmentId),
    z.array(scheduleSchema),
    {
      body,
    },
  );
}

export function updateSchedule(id: string, body: ScheduleChanges): Promise<Schedule> {
  return apiClient.patch(API_ROUTES.schedules.item(id), scheduleSchema, { body });
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiClient.delete(API_ROUTES.schedules.item(id), noContentSchema);
}
