import { z } from "zod";

import {
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
  pending_sessions: z.object({ count: z.number().int(), total_minutes: z.number().int() }),
  latest_receipts: z.array(receiptSummarySchema),
}) satisfies z.ZodType<ApiSchemas["DashboardSummaryResponse"]>;
