import type { z } from "zod";

import type { careerSchema, hourlyRateSchema } from "@/lib/api-schemas";

import type { businessRulesSchema } from "../schemas/catalogs";

export type Career = z.infer<typeof careerSchema>;
export type HourlyRate = z.infer<typeof hourlyRateSchema>;
export type BusinessRules = z.infer<typeof businessRulesSchema>;
