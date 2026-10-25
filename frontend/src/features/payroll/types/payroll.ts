import type { z } from "zod";

import type { PageParams, receiptSummarySchema } from "@/lib/api-schemas";

import type {
  payrollPreviewSchema,
  periodListSchema,
  periodSelectionSchema,
  receiptDetailSchema,
  receiptPageSchema,
} from "../schemas/payroll";

export type PeriodList = z.infer<typeof periodListSchema>;
export type PayrollPreview = z.infer<typeof payrollPreviewSchema>;
export type ReceiptDetail = z.infer<typeof receiptDetailSchema>;
export type ReceiptSummary = z.infer<typeof receiptSummarySchema>;
export type ReceiptPage = z.infer<typeof receiptPageSchema>;
export type PeriodSelection = z.infer<typeof periodSelectionSchema>;

export interface ReceiptListParams extends PageParams {
  year?: number;
}
