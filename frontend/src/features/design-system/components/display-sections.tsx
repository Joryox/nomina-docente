"use client";

import { ClipboardList, Info, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { useState } from "react";

import { Folio } from "@/components/domain/folio";
import { Hours } from "@/components/domain/hours";
import { Money } from "@/components/domain/money";
import { PeriodLabel } from "@/components/domain/period-label";
import { StatusBadge, type StatusKind } from "@/components/domain/status-badge";
import { Logo } from "@/components/layout/logo";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { TableCell, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TimeRangeInput, type TimeRangeValue } from "@/components/ui/time-input";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { DESIGN_GUIDE, DESIGN_GUIDE_SESSIONS, DESIGN_GUIDE_TOTAL } from "@/constants/design-guide";
import { formatLongDate, formatTimeRange } from "@/lib/formatters";

import { GuideExample, GuideSection } from "./guide-section";

const texts = DESIGN_GUIDE;
type Session = (typeof DESIGN_GUIDE_SESSIONS)[number];

const PAGE_SIZE = 20;
const TOTAL_SESSIONS = 78;
const EXAMPLE_PERIOD = {
  year: 2026,
  month: 10,
  fortnight: 2,
  start_date: "2026-10-16",
  end_date: "2026-10-31",
} as const;

const COLUMNS: DataTableColumn<Session>[] = [
  {
    id: "date",
    header: texts.data.columns.date,
    cell: (row) => formatLongDate(row.date),
    sortValue: (row) => row.date,
    className: "whitespace-nowrap",
  },
  {
    id: "subject",
    header: texts.data.columns.subject,
    cell: (row) => row.subject,
    sortValue: (row) => row.subject,
    primary: true,
  },
  {
    id: "career",
    header: texts.data.columns.career,
    cell: (row) => row.career,
    hideOnMobile: true,
  },
  {
    id: "time",
    header: texts.data.columns.time,
    cell: (row) => (
      <span className="whitespace-nowrap figures">{formatTimeRange(row.start, row.end)}</span>
    ),
  },
  {
    id: "hours",
    header: texts.data.columns.hours,
    align: "end",
    cell: (row) => <Hours value={row.hours} />,
    sortValue: (row) => Number(row.hours),
  },
  {
    id: "amount",
    header: texts.data.columns.amount,
    align: "end",
    cell: (row) => <Money amount={row.amount} />,
    sortValue: (row) => Number(row.amount),
  },
  {
    id: "status",
    header: texts.data.columns.status,
    cell: (row) => <StatusBadge status={row.status} />,
  },
];

export function DataSection() {
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [page, setPage] = useState(1);

  return (
    <GuideSection id="tablas" title={texts.sections.data}>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={loading}
          onClick={() => setLoading((v) => !v)}
        >
          {texts.data.loading}
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={empty}
          onClick={() => setEmpty((v) => !v)}
        >
          {texts.data.empty}
        </Button>
      </div>
      <DataTable
        caption={texts.data.caption}
        captionVisible
        columns={COLUMNS}
        rows={empty ? [] : DESIGN_GUIDE_SESSIONS}
        getRowId={(row) => row.id}
        loading={loading}
        defaultSort={{ columnId: "date", direction: "asc" }}
        empty={
          <EmptyState
            icon={ClipboardList}
            title={texts.data.emptyTitle}
            description={texts.data.emptyDescription}
            action={<Button>{texts.data.emptyAction}</Button>}
          />
        }
        footer={
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={4}>{texts.data.total}</TableCell>
            <TableCell data-align="end">
              <Hours value={DESIGN_GUIDE_TOTAL.hours} />
            </TableCell>
            <TableCell data-align="end">
              <Money amount={DESIGN_GUIDE_TOTAL.amount} />
            </TableCell>
            <TableCell />
          </TableRow>
        }
        pagination={{
          page,
          page_size: PAGE_SIZE,
          total: TOTAL_SESSIONS,
          total_pages: Math.ceil(TOTAL_SESSIONS / PAGE_SIZE),
          onPageChange: setPage,
        }}
      />
    </GuideSection>
  );
}

const STATUSES: StatusKind[] = [
  "session-registered",
  "session-pending",
  "session-locked",
  "session-off-schedule",
  "period-future",
  "period-open",
  "period-closed",
  "period-issued",
  "active",
  "inactive",
  "warning",
];

export function FeedbackSection() {
  return (
    <GuideSection id="estados" title={texts.sections.feedback}>
      <GuideExample title={texts.feedback.badges}>
        {STATUSES.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
        <Badge tone="primary">ISC</Badge>
        <Badge>
          <Folio value="NOM-202610-Q1-000042" />
        </Badge>
      </GuideExample>
      <div className="grid gap-3">
        <h3 className="text-overline text-fg-muted uppercase">{texts.feedback.alerts}</h3>
        <Alert tone="info">{texts.feedback.alertInfo}</Alert>
        <Alert tone="success">{texts.feedback.alertSuccess}</Alert>
        <Alert tone="warning" action={<Button variant="link">{texts.buttons.link}</Button>}>
          {texts.feedback.alertWarning}
        </Alert>
        <Alert tone="danger" title={texts.feedback.alertDanger}>
          {texts.feedback.alertDangerAction}
        </Alert>
      </div>
      <GuideExample title={texts.feedback.toasts}>
        <Button
          variant="outline"
          onClick={() =>
            toast.success(texts.feedback.toastSuccess, {
              description: texts.feedback.toastSuccessDescription,
            })
          }
        >
          {texts.feedback.toastSuccess}
        </Button>
        <Button variant="outline" onClick={() => toast.error(texts.feedback.toastError)}>
          {texts.feedback.toastError}
        </Button>
        <Button variant="outline" onClick={() => toast.warning(texts.feedback.toastWarning)}>
          {texts.feedback.toastWarning}
        </Button>
        <Button variant="outline" onClick={() => toast.info(texts.feedback.toastInfo)}>
          {texts.feedback.toastInfo}
        </Button>
      </GuideExample>
      <GuideExample title={texts.feedback.skeleton} className="grid">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </GuideExample>
    </GuideSection>
  );
}

export function OverlaysSection() {
  const [range, setRange] = useState<TimeRangeValue>({ start: "07:00", end: "09:00" });

  return (
    <GuideSection id="capas" title={texts.sections.overlays}>
      <GuideExample title="Dialog, ConfirmDialog, Tooltip y DropdownMenu" className="items-center">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Pencil aria-hidden="true" />
              {texts.overlays.openDialog}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{texts.overlays.dialogTitle}</DialogTitle>
              <DialogDescription>{texts.overlays.dialogDescription}</DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-(--field-gap)">
              <TimeRangeInput value={range} onChange={setRange} required />
              <Field label={texts.forms.notes} hint={texts.forms.notesHint}>
                <Textarea />
              </Field>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{texts.buttons.ghost}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>{texts.overlays.save}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          trigger={
            <Button variant="danger">
              <Trash2 aria-hidden="true" />
              {texts.overlays.confirmTrigger}
            </Button>
          }
          title={texts.overlays.confirmTitle}
          description={texts.overlays.confirmDescription}
          consequences={texts.overlays.confirmLoss}
          confirmLabel={texts.overlays.confirmLabel}
          onConfirm={() => new Promise((resolve) => setTimeout(resolve, 800))}
        />
        <ConfirmDialog
          tone="primary"
          trigger={<Button>{texts.overlays.issueTrigger}</Button>}
          title={texts.overlays.issueTitle}
          description={texts.overlays.issueDescription}
          consequences={texts.overlays.issueLoss}
          confirmLabel={texts.overlays.issueLabel}
          onConfirm={() => new Promise((resolve) => setTimeout(resolve, 800))}
        />
        <Tooltip content={texts.overlays.tooltipContent}>
          <Button variant="ghost" size="icon" aria-label={texts.overlays.tooltipTrigger}>
            <Info aria-hidden="true" />
          </Button>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label={texts.overlays.menuTrigger}>
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Pencil aria-hidden="true" />
              {texts.overlays.menuEdit}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Power aria-hidden="true" />
              {texts.overlays.menuDeactivate}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger">
              <Trash2 aria-hidden="true" />
              {texts.overlays.menuDelete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </GuideExample>
      <GuideExample title="Tabs" className="block">
        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">{texts.overlays.tabsList}</TabsTrigger>
            <TabsTrigger value="semana">{texts.overlays.tabsWeek}</TabsTrigger>
          </TabsList>
          <TabsContent value="lista" className="text-body text-fg-muted">
            {texts.overlays.tabsListContent}
          </TabsContent>
          <TabsContent value="semana" className="text-body text-fg-muted">
            {texts.overlays.tabsWeekContent}
          </TabsContent>
        </Tabs>
      </GuideExample>
    </GuideSection>
  );
}

export function DomainSection() {
  return (
    <GuideSection id="dominio" title={texts.sections.domain}>
      <div className="rounded-lg border border-line bg-canvas p-5">
        <PageHeader
          title={texts.domain.pageTitle}
          description={texts.domain.pageDescription}
          meta={
            <>
              <PeriodLabel period={EXAMPLE_PERIOD} withRange className="text-small text-fg" />
              <StatusBadge status="period-open" />
            </>
          }
          actions={
            <>
              <Button variant="outline">{texts.buttons.outline}</Button>
              <Button>{texts.buttons.primary}</Button>
            </>
          }
          className="mb-5"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            emphasis
            label={texts.domain.statTotal}
            value={<Money amount="5221.67" />}
            description={texts.domain.statDescription}
            footer={
              <Button variant="link" size="sm">
                {texts.domain.viewDetail}
              </Button>
            }
          />
          <StatCard
            label={texts.domain.statHours}
            value={<Hours value="39.00" />}
            description={texts.domain.statHoursDescription}
          />
          <StatCard
            label={texts.domain.statPending}
            value="2"
            description={texts.domain.statPendingDescription}
          />
        </div>
      </div>
      <GuideExample title="Money · Hours · PeriodLabel · Folio" className="grid">
        <p className="text-body">
          <Money amount="1250.00" /> · <Money amount="12480.5" /> · <Hours value="12.50" /> ·{" "}
          <Folio value="NOM-202610-Q2-000042" />
        </p>
        <PeriodLabel period={EXAMPLE_PERIOD} withRange />
        <PeriodLabel
          period={{
            year: 2028,
            month: 2,
            fortnight: 2,
            start_date: "2028-02-16",
            end_date: "2028-02-29",
          }}
          withRange
        />
      </GuideExample>
    </GuideSection>
  );
}

export function IdentitySection() {
  return (
    <GuideSection id="identidad" title={texts.sections.layout} description={texts.layout.logoNote}>
      <GuideExample title={texts.layout.logos} className="items-center gap-8">
        <Logo variant="full" />
        <Logo variant="compact" />
        <Logo variant="mark" />
        <span className="rounded-md bg-primary p-3">
          <Logo variant="compact" tone="inverse" />
        </span>
      </GuideExample>
      <GuideExample title={texts.layout.breadcrumbs}>
        <Breadcrumbs
          items={texts.layout.breadcrumbExample.map((label, index, all) => ({
            label,
            href: index < all.length - 1 ? "#identidad" : undefined,
          }))}
        />
      </GuideExample>
    </GuideSection>
  );
}

function ComparePanel({ mode }: { mode: "light" | "dark" }) {
  return (
    <div
      data-theme={mode}
      className="grid gap-4 rounded-lg border border-line bg-canvas p-5 text-fg"
    >
      <p className="text-label font-semibold">{texts.contrast[mode]}</p>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              <PeriodLabel period={EXAMPLE_PERIOD} />
            </CardTitle>
            <CardDescription>{texts.domain.statDescription}</CardDescription>
          </div>
          <StatusBadge status="period-closed" />
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-figure figures">
            <Money amount="5221.67" />
          </p>
          <Alert tone="warning">{texts.feedback.alertWarning}</Alert>
          <div className="flex flex-wrap gap-2">
            <Button>{texts.overlays.issueLabel}</Button>
            <Button variant="outline">{texts.buttons.outline}</Button>
            <Button variant="danger">{texts.buttons.danger}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CompareSection() {
  return (
    <GuideSection id="modos" title={texts.sections.compare} description={texts.compare.description}>
      <div className="grid gap-4 lg:grid-cols-2">
        <ComparePanel mode="light" />
        <ComparePanel mode="dark" />
      </div>
    </GuideSection>
  );
}
