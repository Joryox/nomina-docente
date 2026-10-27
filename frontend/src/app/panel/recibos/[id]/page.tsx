import type { Metadata } from "next";

import { SCREENS } from "@/constants/screens";
import { ReceiptDetailPage } from "@/features/payroll/components/receipt-detail-page";

export const metadata: Metadata = { title: SCREENS.receipts.detail.title };

export default function ReceiptRoute() {
  return <ReceiptDetailPage />;
}
