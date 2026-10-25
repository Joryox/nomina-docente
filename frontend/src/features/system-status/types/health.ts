import type { z } from "zod";

import type { healthResponseSchema } from "../schemas/health";

export type HealthResponse = z.infer<typeof healthResponseSchema>;
