"use client";

import { FileCheck2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { TEXTS } from "@/constants/texts";
import { toUserMessage } from "@/lib/api-error";
import { formatHours, formatMoney, formatPeriodName } from "@/lib/formatters";

import { useIssueReceipt, usePayrollPreview } from "../hooks/use-payroll";
import type { PeriodSelection } from "../types/payroll";

const texts = TEXTS.payrollActions;

/**
 * Emite el recibo de una quincena terminada. Al abrir la confirmación se calcula la vista
 * previa para mostrar horas y total antes de fijarlos (RN-28).
 */
export function IssueReceiptButton({ period }: { period: PeriodSelection }) {
  const [open, setOpen] = useState(false);
  const preview = usePayrollPreview(open ? period : undefined);
  const issue = useIssueReceipt();
  const periodName = formatPeriodName(period);

  const description = preview.data
    ? texts.confirmDescription(
        formatHours(preview.data.total_hours),
        formatMoney(preview.data.total_amount),
      )
    : preview.isError
      ? toUserMessage(preview.error)
      : texts.confirmLoading;

  const confirm = async () => {
    try {
      const receipt = await issue.mutateAsync(period);
      toast.success(texts.issued(receipt.folio));
    } catch (error) {
      toast.error(toUserMessage(error));
      throw error;
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="outline" size="sm">
          <FileCheck2 aria-hidden="true" />
          {texts.issue}
        </Button>
      }
      tone="primary"
      title={texts.confirmTitle(periodName)}
      description={description}
      consequences={texts.confirmConsequences}
      confirmLabel={texts.confirmLabel}
      onConfirm={confirm}
    />
  );
}
