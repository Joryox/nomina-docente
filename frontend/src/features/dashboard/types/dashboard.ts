import type { z } from "zod";

import type { dashboardSummarySchema } from "../schemas/dashboard";

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
