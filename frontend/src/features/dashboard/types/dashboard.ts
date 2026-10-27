import type { z } from "zod";

import type { dashboardSummarySchema } from "../schemas/dashboard";

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type PendingClass = DashboardSummary["pending_sessions"]["items"][number];
export type TodayClass = DashboardSummary["today"]["classes"][number];
export type SetupProgress = DashboardSummary["setup"];
