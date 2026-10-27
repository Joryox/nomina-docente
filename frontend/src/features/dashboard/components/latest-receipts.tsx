import { FileText } from "lucide-react";

import { Folio } from "@/components/domain/folio";
import { Hours } from "@/components/domain/hours";
import { Money } from "@/components/domain/money";
import { PeriodLabel } from "@/components/domain/period-label";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TEXTS } from "@/constants/texts";

import type { DashboardSummary } from "../types/dashboard";

const texts = TEXTS.dashboard.receipts;

/** Los recibos emitidos más recientes, con su folio, quincena, horas y total. */
export function LatestReceipts({ receipts }: { receipts: DashboardSummary["latest_receipts"] }) {
  return (
    <Card aria-labelledby="inicio-recibos">
      <CardHeader>
        <CardTitle id="inicio-recibos">{texts.title}</CardTitle>
      </CardHeader>
      {receipts.length === 0 ? (
        <EmptyState icon={FileText} title={texts.empty} description={texts.emptyHint} />
      ) : (
        <ul className="divide-y divide-line">
          {receipts.map((receipt) => (
            <li key={receipt.id} className="grid gap-1 px-5 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <PeriodLabel period={receipt.period} className="text-label font-semibold text-fg" />
                <Money amount={receipt.total_amount} className="text-label font-semibold text-fg" />
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-small text-fg-muted">
                <span>
                  <span className="sr-only">{texts.folio}: </span>
                  <Folio value={receipt.folio} />
                </span>
                <span>
                  <span className="sr-only">{texts.hours}: </span>
                  <Hours value={receipt.total_hours} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
