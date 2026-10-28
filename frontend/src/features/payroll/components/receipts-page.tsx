"use client";

import { Eye, FileText, Receipt } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Folio } from "@/components/domain/folio";
import { Hours } from "@/components/domain/hours";
import { Money } from "@/components/domain/money";
import { PeriodLabel } from "@/components/domain/period-label";
import { StatusBadge } from "@/components/domain/status-badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RECEIPT_YEARS_COUNT, RECENT_PERIODS_COUNT } from "@/constants/query";
import { APP_ROUTES, PERIOD_PARAM } from "@/constants/routes";
import { SCREENS } from "@/constants/screens";
import { TEXTS } from "@/constants/texts";
import { useBusinessRules } from "@/features/catalogs/hooks/use-catalogs";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard";
import { getErrorMessage, toUserMessage, toWarningMessage } from "@/lib/api-error";
import type { ApiSchemas } from "@/lib/api-types";
import { formatDateTime, formatPeriodName, formatSubjectWithGroup } from "@/lib/formatters";
import { toPaginationState } from "@/lib/pagination";
import { parsePeriodKey, periodKey, periodOf, recentPeriods } from "@/lib/periods";

import { usePayrollPreview, useReceipts } from "../hooks/use-payroll";
import type { PayrollPreview, ReceiptSummary } from "../types/payroll";
import { DownloadReceiptButton } from "./download-receipt-button";
import { IssueReceiptButton } from "./issue-receipt-button";

const texts = SCREENS.receipts;

type BusinessRules = ApiSchemas["BusinessRulesResponse"];

/** Recibos: vista previa de una quincena con emisión y la lista de recibos emitidos. */
export function ReceiptsPage() {
  const rules = useBusinessRules();
  return (
    <>
      <PageHeader title={texts.title} description={texts.description} />
      {rules.isError ? (
        <Alert
          tone="danger"
          title={SCREENS.common.loadError}
          announce
          action={
            <Button variant="outline" size="sm" onClick={() => void rules.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(rules.error)}
        </Alert>
      ) : rules.data ? (
        <div className="grid gap-(--section-gap)">
          <PreviewSection rules={rules.data} />
          <IssuedReceipts today={rules.data.today} />
        </div>
      ) : (
        <div className="grid gap-(--section-gap)" aria-busy="true">
          <p className="sr-only">{TEXTS.ui.loading}</p>
          <Skeleton className="h-64 w-full" />
        </div>
      )}
    </>
  );
}

function PreviewSection({ rules }: { rules: BusinessRules }) {
  const searchParams = useSearchParams();
  const requested = parsePeriodKey(searchParams.get(PERIOD_PARAM) ?? "");
  const periods = recentPeriods(rules.today, RECENT_PERIODS_COUNT).map(periodKey);
  const [period, setPeriod] = useState(periodKey(requested ?? periodOf(rules.today)));
  const selected = parsePeriodKey(period);
  const preview = usePayrollPreview(selected);
  const summary = useDashboardSummary();
  const options = periods.includes(period) ? periods : [period, ...periods];
  // Quincenas terminadas con sesiones y sin recibo: se proponen para emitir.
  const unissued = (summary.data?.unissued_periods ?? []).filter(
    (item) => periodKey(item) !== period,
  );

  return (
    <Card aria-labelledby="recibos-vista-previa">
      <CardHeader>
        <div>
          <CardTitle id="recibos-vista-previa">{texts.preview.title}</CardTitle>
          {preview.data ? (
            <CardDescription>
              <PeriodLabel period={preview.data.period} withRange />
            </CardDescription>
          ) : null}
        </div>
        <Field label={texts.preview.periodLabel} className="w-full sm:w-72">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((key) => {
                const parsed = parsePeriodKey(key);
                return parsed ? (
                  <SelectItem key={key} value={key}>
                    {formatPeriodName(parsed)}
                  </SelectItem>
                ) : null;
              })}
            </SelectContent>
          </Select>
        </Field>
      </CardHeader>
      {unissued.length > 0 ? (
        <CardContent className="grid gap-3 border-b border-line">
          {unissued.map((item) => (
            <Alert
              key={periodKey(item)}
              tone="info"
              action={
                <Button variant="outline" size="sm" onClick={() => setPeriod(periodKey(item))}>
                  {texts.preview.showUnissued}
                </Button>
              }
            >
              {texts.preview.unissued(formatPeriodName(item))}
            </Alert>
          ))}
        </CardContent>
      ) : null}
      {preview.isError ? (
        <CardContent>
          <Alert
            tone="danger"
            action={
              <Button variant="outline" size="sm" onClick={() => void preview.refetch()}>
                {TEXTS.ui.retry}
              </Button>
            }
          >
            {toUserMessage(preview.error)}
          </Alert>
        </CardContent>
      ) : preview.data ? (
        <PreviewBody preview={preview.data} />
      ) : (
        <CardContent className="grid gap-3" aria-busy="true">
          <p className="sr-only">{TEXTS.ui.loading}</p>
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      )}
    </Card>
  );
}

function PreviewBody({ preview }: { preview: PayrollPreview }) {
  const columns = texts.preview.columns;
  const issued = preview.status === "issued" && preview.receipt_id;
  const blockers = preview.issue_blockers.filter(
    // Sin sesiones ya se explica con el estado vacío.
    (code) => code !== "PERIOD_WITHOUT_SESSIONS" && code !== "RECEIPT_ALREADY_ISSUED",
  );

  return (
    <CardContent className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={`period-${preview.status}`} />
      </div>
      {issued ? (
        <Alert
          tone="success"
          action={
            <Button size="sm" asChild>
              <Link href={APP_ROUTES.receipt(preview.receipt_id ?? "")}>
                {texts.preview.viewReceipt}
              </Link>
            </Button>
          }
        >
          {texts.preview.issued}
        </Alert>
      ) : null}
      {!issued && preview.warnings.length > 0 ? (
        <Alert tone="warning" title={texts.preview.warningsTitle}>
          <ul className="grid list-disc gap-1 pl-5">
            {preview.warnings.map((warning) => (
              <li key={warning.code}>{toWarningMessage(warning)}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {preview.lines.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={texts.preview.empty}
          description={texts.preview.emptyHint}
          action={
            <Button variant="outline" asChild>
              <Link href={APP_ROUTES.logbook}>{texts.preview.goToLogbook}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="sr-only">{texts.preview.caption}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{columns.subject}</TableHead>
                  <TableHead>{columns.career}</TableHead>
                  <TableHead className="text-right">{columns.sessions}</TableHead>
                  <TableHead className="text-right">{columns.hours}</TableHead>
                  <TableHead className="text-right">{columns.rate}</TableHead>
                  <TableHead className="text-right">{columns.amount}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.lines.map((line) => (
                  <TableRow key={`${line.assignment_id}-${line.hourly_rate}`}>
                    <TableCell className="font-medium">
                      {formatSubjectWithGroup(line.subject_name, line.group)}
                    </TableCell>
                    <TableCell>{line.career_name}</TableCell>
                    <TableCell className="text-right figures">{line.session_count}</TableCell>
                    <TableCell className="text-right">
                      <Hours value={line.hours} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={line.hourly_rate} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money amount={line.amount} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <dl className="ml-auto grid w-full gap-1 sm:w-1/2">
            <div className="flex justify-between gap-6 text-body">
              <dt>{texts.preview.totalHours}</dt>
              <dd>
                <Hours value={preview.total_hours} />
              </dd>
            </div>
            <div className="flex justify-between gap-6 border-t border-line pt-2 text-subtitle">
              <dt>{texts.preview.totalAmount}</dt>
              <dd>
                <Money amount={preview.total_amount} />
              </dd>
            </div>
            <p className="text-small text-fg-muted sm:text-right">{texts.preview.grossNote}</p>
          </dl>
        </>
      )}

      {!issued && preview.lines.length > 0 ? (
        blockers.length > 0 ? (
          <Alert tone="info" title={texts.preview.blockersTitle}>
            <ul className="grid gap-1">
              {blockers.map((code) => (
                <li key={code}>{getErrorMessage(code)}</li>
              ))}
            </ul>
          </Alert>
        ) : (
          <div className="flex justify-end">
            <IssueReceiptButton
              period={{
                year: preview.period.year,
                month: preview.period.month,
                fortnight: preview.period.fortnight,
              }}
              variant="primary"
              size="md"
            />
          </div>
        )
      ) : null}
    </CardContent>
  );
}

function IssuedReceipts({ today }: { today: string }) {
  const currentYear = Number(today.slice(0, 4));
  const years = Array.from({ length: RECEIPT_YEARS_COUNT }, (_, index) => currentYear - index);
  const [year, setYear] = useState(currentYear);
  const [page, setPage] = useState(1);
  const receipts = useReceipts({ year, page });
  const columns = texts.list.columns;

  const tableColumns: DataTableColumn<ReceiptSummary>[] = [
    {
      id: "period",
      header: columns.period,
      primary: true,
      sortValue: (receipt) => receipt.period.start_date,
      cell: (receipt) => <PeriodLabel period={receipt.period} className="font-semibold text-fg" />,
    },
    {
      id: "folio",
      header: columns.folio,
      cell: (receipt) => <Folio value={receipt.folio} />,
    },
    {
      id: "issued",
      header: columns.issued,
      hideOnMobile: true,
      sortValue: (receipt) => receipt.issued_at,
      cell: (receipt) => formatDateTime(receipt.issued_at),
    },
    {
      id: "hours",
      header: columns.hours,
      align: "end",
      cell: (receipt) => <Hours value={receipt.total_hours} />,
    },
    {
      id: "total",
      header: columns.total,
      align: "end",
      sortValue: (receipt) => Number(receipt.total_amount),
      cell: (receipt) => <Money amount={receipt.total_amount} />,
    },
    {
      id: "actions",
      header: SCREENS.common.actions,
      align: "end",
      cell: (receipt) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={APP_ROUTES.receipt(receipt.id)}
              aria-label={texts.list.viewLabel(receipt.folio)}
            >
              <Eye aria-hidden="true" />
              {texts.list.view}
            </Link>
          </Button>
          <DownloadReceiptButton
            receiptId={receipt.id}
            folio={receipt.folio}
            variant="ghost"
            size="sm"
            label="PDF"
          />
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="recibos-emitidos" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="recibos-emitidos" className="text-subtitle text-fg">
          {texts.list.title}
        </h2>
        <Field label={texts.list.yearLabel} className="w-full sm:w-40">
          <Select
            value={String(year)}
            onValueChange={(value) => {
              setYear(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {receipts.isError ? (
        <Alert
          tone="danger"
          action={
            <Button variant="outline" size="sm" onClick={() => void receipts.refetch()}>
              {TEXTS.ui.retry}
            </Button>
          }
        >
          {toUserMessage(receipts.error)}
        </Alert>
      ) : (
        <DataTable
          caption={texts.list.caption}
          columns={tableColumns}
          rows={receipts.data?.items ?? []}
          getRowId={(receipt) => receipt.id}
          loading={receipts.isPending}
          pagination={
            receipts.data && receipts.data.total_pages > 1
              ? { ...toPaginationState(receipts.data), onPageChange: setPage }
              : undefined
          }
          empty={
            <EmptyState
              icon={Receipt}
              title={texts.list.empty(year)}
              description={texts.list.emptyHint}
            />
          }
        />
      )}
    </section>
  );
}
