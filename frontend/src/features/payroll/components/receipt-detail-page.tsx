"use client";

import { ArrowLeft, FileX2, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_ROUTES } from "@/constants/routes";
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { ApiError, toUserMessage } from "@/lib/api-error";

import { useReceipt } from "../hooks/use-payroll";
import { DownloadReceiptButton } from "./download-receipt-button";
import { ReceiptDocument } from "./receipt-document";

const texts = SCREENS.receipts.detail;
// Un identificador mal formado (422) se trata igual que uno que no existe (404).
const NOT_FOUND_STATUSES: ReadonlySet<number> = new Set([404, 422]);

function BackLink() {
  return (
    <Button variant="ghost" asChild>
      <Link href={APP_ROUTES.receipts}>
        <ArrowLeft aria-hidden="true" />
        {texts.back}
      </Link>
    </Button>
  );
}

/** Recibo emitido: documento oficial con descarga en PDF e impresión desde el navegador. */
export function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const receipt = useReceipt(id);

  if (
    receipt.isError &&
    receipt.error instanceof ApiError &&
    NOT_FOUND_STATUSES.has(receipt.error.status)
  ) {
    return (
      <>
        <PageHeader title={texts.title} actions={<BackLink />} />
        <Card>
          <EmptyState
            icon={FileX2}
            title={texts.notFound}
            description={texts.notFoundHint}
            action={<BackLink />}
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={texts.title}
        className="print:hidden"
        actions={
          <>
            <BackLink />
            {receipt.data ? (
              <>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer aria-hidden="true" />
                  {texts.print}
                </Button>
                <DownloadReceiptButton receiptId={receipt.data.id} folio={receipt.data.folio} />
              </>
            ) : null}
          </>
        }
      />
      {receipt.isError ? (
        <Alert
          tone="danger"
          announce
          action={
            <Button variant="outline" size="sm" onClick={() => void receipt.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(receipt.error)}
        </Alert>
      ) : receipt.data ? (
        <ReceiptDocument receipt={receipt.data} />
      ) : (
        <div className="mx-auto grid w-full max-w-content gap-4" aria-busy="true">
          <p className="sr-only">{TEXTS.ui.loading}</p>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
    </>
  );
}
