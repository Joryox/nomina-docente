import { z } from "zod";

import { PERIOD_YEAR_RANGE } from "@/constants/validation";
import {
  decimalStringSchema,
  errorCodeSchema,
  fortnightSchema,
  isoDateTimeSchema,
  pageSchema,
  periodSchema,
  periodStatusSchema,
  receiptSummarySchema,
  warningSchema,
} from "@/lib/api-schemas";
import type { ApiSchemas } from "@/lib/api-types";

export const periodListSchema = z.object({
  year: z.number().int(),
  periods: z.array(
    z.object({
      period: periodSchema,
      status: periodStatusSchema,
      receipt_id: z.uuid().nullable(),
      folio: z.string().nullable(),
    }),
  ),
}) satisfies z.ZodType<ApiSchemas["PeriodListResponse"]>;

export const payrollPreviewSchema = z.object({
  period: periodSchema,
  status: periodStatusSchema,
  receipt_id: z.uuid().nullable(),
  lines: z.array(
    z.object({
      assignment_id: z.uuid(),
      subject_name: z.string(),
      career_name: z.string(),
      group: z.string().nullable(),
      hourly_rate: decimalStringSchema,
      session_count: z.number().int(),
      minutes: z.number().int(),
      hours: decimalStringSchema,
      amount: decimalStringSchema,
    }),
  ),
  session_count: z.number().int(),
  total_minutes: z.number().int(),
  total_hours: decimalStringSchema,
  total_amount: decimalStringSchema,
  can_issue: z.boolean(),
  issue_blockers: z.array(errorCodeSchema),
  warnings: z.array(warningSchema),
}) satisfies z.ZodType<ApiSchemas["PayrollPreviewResponse"]>;

export const receiptDetailSchema = z.object({
  id: z.uuid(),
  folio: z.string(),
  institution: z.object({ name: z.string(), short_name: z.string() }),
  teacher: z.object({ full_name: z.string(), employee_number: z.string().nullable() }),
  period: periodSchema,
  issued_at: isoDateTimeSchema,
  lines: z.array(
    z.object({
      assignment_id: z.uuid(),
      subject_name: z.string(),
      career_name: z.string(),
      group: z.string().nullable(),
      hourly_rate: decimalStringSchema,
      minutes: z.number().int(),
      hours: decimalStringSchema,
      amount: decimalStringSchema,
    }),
  ),
  total_minutes: z.number().int(),
  total_hours: decimalStringSchema,
  total_amount: decimalStringSchema,
  total_amount_words: z.string(),
}) satisfies z.ZodType<ApiSchemas["ReceiptDetailResponse"]>;

export const receiptPageSchema = pageSchema(receiptSummarySchema) satisfies z.ZodType<
  ApiSchemas["ReceiptPage"]
>;

/** Periodo a emitir: año, mes y quincena se eligen de la lista de periodos de la API. */
export const periodSelectionSchema = z.object({
  year: z.number().int().min(PERIOD_YEAR_RANGE.min).max(PERIOD_YEAR_RANGE.max),
  month: z.number().int().min(1).max(12),
  fortnight: fortnightSchema,
}) satisfies z.ZodType<ApiSchemas["ReceiptCreate"]>;
