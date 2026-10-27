import type { Metadata } from "next";
import { Suspense } from "react";

import { SCREENS } from "@/constants/screens";
import { ReceiptsPage } from "@/features/payroll/components/receipts-page";

export const metadata: Metadata = { title: SCREENS.receipts.title };

export default function ReceiptsRoute() {
  return (
    // useSearchParams (quincena de la vista previa) necesita un límite de Suspense.
    <Suspense>
      <ReceiptsPage />
    </Suspense>
  );
}
