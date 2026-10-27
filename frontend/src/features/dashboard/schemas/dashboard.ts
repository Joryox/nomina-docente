import { z } from "zod";

import {
  assignmentSummarySchema,
  clockTimeSchema,
  decimalStringSchema,
  isoDateSchema,
  periodSchema,
  periodStatusSchema,
  receiptSummarySchema,
  scheduledClassSchema,
} from "@/lib/api-schemas";
import type { ApiSchemas } from "@/lib/api-types";

export const dashboardSummarySchema = z.object({
  current_period: z.object({
    period: periodSchema,
    status: periodStatusSchema,
    session_count: z.number().int(),
    total_minutes: z.number().int(),
    total_hours: decimalStringSchema,
    estimated_amount: decimalStringSchema,
  }),
  today: z.object({
    date: isoDateSchema,
    classes: z.array(scheduledClassSchema),
    registered_count: z.number().int(),
    pending_count: z.number().int(),
  }),
  pending_sessions: z.object({
    count: z.number().int(),
    total_minutes: z.number().int(),
    items: z.array(
      z.object({
        date: isoDateSchema,
        schedule_id: z.uuid(),
        assignment: assignmentSummarySchema,
        start_time: clockTimeSchema,
        end_time: clockTimeSchema,
      }),
    ),
  }),
  latest_receipts: z.array(receiptSummarySchema),
  unissued_periods: z.array(periodSchema),
  setup: z.object({
    subject_count: z.number().int(),
    active_assignment_count: z.number().int(),
    schedule_count: z.number().int(),
    session_count: z.number().int(),
  }),
}) satisfies z.ZodType<ApiSchemas["DashboardSummaryResponse"]>;
