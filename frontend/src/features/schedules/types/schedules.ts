import type { z } from "zod";

import type { scheduleSchema } from "@/lib/api-schemas";

import type { scheduleFormSchema, weeklyScheduleSchema } from "../schemas/schedules";

export type Schedule = z.infer<typeof scheduleSchema>;
export type WeeklySchedule = z.infer<typeof weeklyScheduleSchema>;
export type ScheduleFormValues = z.input<ReturnType<typeof scheduleFormSchema>>;
export type SchedulePayload = z.output<ReturnType<typeof scheduleFormSchema>>;
export type ScheduleChanges = Partial<SchedulePayload>;
