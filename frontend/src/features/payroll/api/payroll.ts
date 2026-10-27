import { API_ROUTES } from "@/constants/routes";
import { apiClient, type DownloadedFile } from "@/lib/api-client";
import { withQuery } from "@/lib/api-paths";

import {
  payrollPreviewSchema,
  periodListSchema,
  receiptDetailSchema,
  receiptPageSchema,
} from "../schemas/payroll";
import type {
  PayrollPreview,
  PeriodList,
  PeriodSelection,
  ReceiptDetail,
  ReceiptListParams,
  ReceiptPage,
} from "../types/payroll";

const routes = API_ROUTES.payroll;

/** Las 24 quincenas del año con sus fechas exactas y su estado. */
export function getPeriods(year: number, signal?: AbortSignal): Promise<PeriodList> {
  return apiClient.get(withQuery(routes.periods, { year }), periodListSchema, { signal });
}

/** Cálculo en vivo del periodo con la bitácora registrada; nada se guarda. */
export function getPreview(period: PeriodSelection, signal?: AbortSignal): Promise<PayrollPreview> {
  return apiClient.get(withQuery(routes.preview, { ...period }), payrollPreviewSchema, { signal });
}

export function listReceipts(
  params: ReceiptListParams,
  signal?: AbortSignal,
): Promise<ReceiptPage> {
  return apiClient.get(withQuery(routes.receipts, { ...params }), receiptPageSchema, { signal });
}

export function getReceipt(id: string, signal?: AbortSignal): Promise<ReceiptDetail> {
  return apiClient.get(routes.receipt(id), receiptDetailSchema, { signal });
}

/** Emite el recibo (copia fija con folio) y bloquea la bitácora del periodo. */
export function issueReceipt(period: PeriodSelection): Promise<ReceiptDetail> {
  return apiClient.post(routes.receipts, receiptDetailSchema, { body: period });
}

/** PDF del recibo emitido (con el nombre de archivo que propone el servidor). */
export function downloadReceiptPdf(id: string): Promise<DownloadedFile> {
  return apiClient.download(routes.receiptPdf(id));
}
