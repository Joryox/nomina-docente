import type { z } from "zod";

import type { scheduleSchema } from "@/lib/api-schemas";
import type { ApiSchemas } from "@/lib/api-types";

import type {
  newScheduleFormSchema,
  scheduleBatchFormSchema,
  scheduleFormSchema,
  weeklyScheduleSchema,
} from "../schemas/schedules";

export type Schedule = z.infer<typeof scheduleSchema>;
export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>;
export type ScheduleFormValues = z.input<ReturnType<typeof scheduleFormSchema>>;
export type SchedulePayload = z.output<ReturnType<typeof scheduleFormSchema>>;
export type ScheduleChanges = Partial<SchedulePayload>;
export type NewScheduleFormValues = z.input<ReturnType<typeof newScheduleFormSchema>>;
export type NewScheduleFormOutput = z.output<ReturnType<typeof newScheduleFormSchema>>;
export type ScheduleBatchFormValues = z.input<ReturnType<typeof scheduleBatchFormSchema>>;
export type ScheduleBatchFormOutput = z.output<ReturnType<typeof scheduleBatchFormSchema>>;
export type ScheduleBatchPayload = ApiSchemas["ScheduleBatchCreate"];
