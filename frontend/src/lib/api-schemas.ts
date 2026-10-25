import { z } from "zod";

import { API_ERROR_MESSAGES } from "@/constants/error-messages";
import { CLOCK_TIME_PATTERN } from "@/constants/validation";
import { WARNING_MESSAGES } from "@/constants/warning-messages";

import type { ApiErrorCode, ApiSchemas, ApiWarningCode } from "./api-types";

/**
 * Piezas de Zod compartidas por las features. Cada schema se declara con `satisfies`
 * contra el tipo generado del OpenAPI: si el backend cambia un contrato, TypeScript marca
 * aquí la diferencia en lugar de que falle en tiempo de ejecución.
 */

/** Dinero u horas: cadena decimal con dos decimales ("1250.00"), nunca un número. */
export const decimalStringSchema = z.string().regex(/^-?\d+\.\d{2}$/);
/** Hora del día en 24 horas sin segundos ("07:00"). */
export const clockTimeSchema = z.string().regex(CLOCK_TIME_PATTERN);
/** Fecha de calendario ISO ("2026-10-19"). */
export const isoDateSchema = z.iso.date();
export const isoDateTimeSchema = z.string();

export const weekdaySchema = z.literal([1, 2, 3, 4, 5, 6, 7]);
export const fortnightSchema = z.literal([1, 2]);

export const errorCodeSchema = z.enum(
  Object.keys(API_ERROR_MESSAGES) as [ApiErrorCode, ...ApiErrorCode[]],
);
export const warningCodeSchema = z.enum(
  Object.keys(WARNING_MESSAGES) as [ApiWarningCode, ...ApiWarningCode[]],
);

export const detailsSchema = z.record(z.string(), z.unknown());

export const warningSchema = z.object({
  code: warningCodeSchema,
  message: z.string(),
  details: detailsSchema.default({}),
}) satisfies z.ZodType<ApiSchemas["WarningItem"]>;

export const periodSchema = z.object({
  year: z.number().int(),
  month: z.number().int(),
  fortnight: fortnightSchema,
  start_date: isoDateSchema,
  end_date: isoDateSchema,
  is_current: z.boolean(),
  is_finished: z.boolean(),
}) satisfies z.ZodType<ApiSchemas["PeriodResponse"]>;

export const assignmentSummarySchema = z.object({
  id: z.uuid(),
  subject_name: z.string(),
  career_code: z.string(),
  career_name: z.string(),
  is_active: z.boolean(),
}) satisfies z.ZodType<ApiSchemas["AssignmentSummary"]>;

const pageFields = {
  page: z.number().int().min(1),
  page_size: z.number().int().min(1),
  total_items: z.number().int().min(0),
  total_pages: z.number().int().min(0),
};

/** Sobre estándar de todos los listados de la API. */
export function pageSchema<TItem extends z.ZodType>(item: TItem) {
  return z.object({ items: z.array(item), ...pageFields });
}

/** Respuestas sin cuerpo (204). */
export const noContentSchema = z.undefined();

/** Parámetros de paginación comunes a todos los listados. */
export interface PageParams {
  page?: number;
  page_size?: number;
}

// --- Recursos que aparecen dentro de varias features ------------------------------------

export const careerSchema = z.object({
  code: z.string(),
  name: z.string(),
  career_type: z.object({ code: z.string(), name: z.string() }),
  is_active: z.boolean(),
}) satisfies z.ZodType<ApiSchemas["CareerResponse"]>;

export const hourlyRateSchema = z.object({
  amount: decimalStringSchema,
  is_active: z.boolean(),
}) satisfies z.ZodType<ApiSchemas["HourlyRateResponse"]>;

export const scheduleSchema = z.object({
  id: z.uuid(),
  assignment_id: z.uuid(),
  weekday: weekdaySchema,
  start_time: clockTimeSchema,
  end_time: clockTimeSchema,
  duration_minutes: z.number().int(),
}) satisfies z.ZodType<ApiSchemas["ScheduleResponse"]>;

export const scheduledClassSchema = z.object({
  schedule_id: z.uuid(),
  assignment: assignmentSummarySchema,
  start_time: clockTimeSchema,
  end_time: clockTimeSchema,
  is_due: z.boolean(),
  registered: z.boolean(),
  logbook_entry_id: z.uuid().nullable(),
}) satisfies z.ZodType<ApiSchemas["ScheduledClass"]>;

export const periodStatusSchema = z.enum(["future", "open", "closed", "issued"]);

export const receiptSummarySchema = z.object({
  id: z.uuid(),
  folio: z.string(),
  period: periodSchema,
  issued_at: isoDateTimeSchema,
  total_hours: decimalStringSchema,
  total_amount: decimalStringSchema,
}) satisfies z.ZodType<ApiSchemas["ReceiptSummary"]>;
