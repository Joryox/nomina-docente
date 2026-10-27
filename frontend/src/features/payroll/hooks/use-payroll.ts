import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateAfter } from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";
import { saveFile } from "@/lib/save-file";

import {
  downloadReceiptPdf,
  getPeriods,
  getPreview,
  getReceipt,
  issueReceipt,
  listReceipts,
} from "../api/payroll";
import type { PeriodSelection, ReceiptListParams } from "../types/payroll";

export function usePayrollPeriods(year: number) {
  return useQuery({
    queryKey: queryKeys.payroll.periods(year),
    queryFn: ({ signal }) => getPeriods(year, signal),
  });
}

/** Vista previa del recibo; espera a que se elija un periodo. */
export function usePayrollPreview(period: PeriodSelection | undefined) {
  return useQuery({
    queryKey: queryKeys.payroll.preview(period ?? {}),
    queryFn: ({ signal }) => {
      if (!period) {
        throw new Error("Falta el periodo de la vista previa.");
      }
      return getPreview(period, signal);
    },
    enabled: Boolean(period),
  });
}

export function useReceipts(params: ReceiptListParams = {}) {
  return useQuery({
    queryKey: queryKeys.payroll.receipts(params),
    queryFn: ({ signal }) => listReceipts(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useReceipt(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payroll.receipt(id ?? ""),
    queryFn: ({ signal }) => getReceipt(id ?? "", signal),
    enabled: Boolean(id),
  });
}

/** Emite el recibo. El recibo emitido ya no cambia: se guarda en caché directamente. */
export function useIssueReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: issueReceipt,
    onSuccess: async (receipt) => {
      queryClient.setQueryData(queryKeys.payroll.receipt(receipt.id), receipt);
      await invalidateAfter(queryClient, "receipts");
    },
  });
}

/** Descarga el PDF del recibo y lo entrega al navegador para guardarlo. */
export function useDownloadReceiptPdf() {
  return useMutation({
    mutationFn: async ({ id, fallbackName }: { id: string; fallbackName: string }) => {
      const file = await downloadReceiptPdf(id);
      saveFile(file.blob, file.filename ?? fallbackName);
    },
  });
}
