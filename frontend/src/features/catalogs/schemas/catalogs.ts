import { z } from "zod";

import { careerSchema, hourlyRateSchema, isoDateSchema, pageSchema } from "@/lib/api-schemas";
import type { ApiSchemas } from "@/lib/api-types";

export const careerPageSchema = pageSchema(careerSchema) satisfies z.ZodType<
  ApiSchemas["CareerPage"]
>;

export const hourlyRatePageSchema = pageSchema(hourlyRateSchema) satisfies z.ZodType<
  ApiSchemas["HourlyRatePage"]
>;

/** Reglas configurables del servidor: los formularios validan con ellas sin duplicarlas. */
export const businessRulesSchema = z.object({
  timezone: z.string(),
  today: isoDateSchema,
  class_min_duration_minutes: z.number().int(),
  class_max_duration_minutes: z.number().int(),
  logbook_max_age_days: z.number().int(),
  payroll_issue_requires_closed_period: z.boolean(),
  max_page_size: z.number().int(),
  quick_logbook_max_entries: z.number().int(),
}) satisfies z.ZodType<ApiSchemas["BusinessRulesResponse"]>;
