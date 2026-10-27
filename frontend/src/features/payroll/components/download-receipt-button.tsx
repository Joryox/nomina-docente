"use client";

import { Download } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { SCREENS } from "@/constants/screens";
import { toUserMessage } from "@/lib/api-error";

import { useDownloadReceiptPdf } from "../hooks/use-payroll";

const texts = SCREENS.receipts.detail;

/** Descarga el PDF del recibo, generado por el servidor con el mismo diseño del detalle. */
export function DownloadReceiptButton({
  receiptId,
  folio,
  variant = "primary",
  size = "md",
  label = texts.download,
}: Pick<ButtonProps, "variant" | "size"> & { receiptId: string; folio: string; label?: string }) {
  const download = useDownloadReceiptPdf();
  return (
    <Button
      variant={variant}
      size={size}
      loading={download.isPending}
      loadingLabel={texts.downloading}
      aria-label={`${texts.download} ${folio}`}
      onClick={() =>
        download.mutate(
          { id: receiptId, fallbackName: `recibo-${folio}.pdf` },
          {
            onSuccess: () => toast.success(texts.downloaded),
            onError: (error) => toast.error(toUserMessage(error)),
          },
        )
      }
    >
      <Download aria-hidden="true" />
      {label}
    </Button>
  );
}
