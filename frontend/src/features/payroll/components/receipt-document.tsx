import { Folio } from "@/components/domain/folio";
import { Hours } from "@/components/domain/hours";
import { Money } from "@/components/domain/money";
import { PeriodLabel } from "@/components/domain/period-label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SCREENS } from "@/constants/screens";
import { formatDateTime, formatSubjectWithGroup } from "@/lib/formatters";

import type { ReceiptDetail } from "../types/payroll";

const texts = SCREENS.receipts.detail.document;

/**
 * El recibo emitido presentado como documento oficial (RN-27): membrete institucional,
 * folio, periodo, docente, conceptos, total con letra y espacios de firma. Es el mismo
 * contenido que el PDF del backend y se imprime limpio desde el navegador.
 */
export function ReceiptDocument({ receipt }: { receipt: ReceiptDetail }) {
  const details = [
    { label: texts.period, value: <PeriodLabel period={receipt.period} withRange /> },
    { label: texts.issued, value: formatDateTime(receipt.issued_at) },
    { label: texts.teacher, value: receipt.teacher.full_name },
    { label: texts.employee, value: receipt.teacher.employee_number ?? texts.noEmployee },
  ];

  return (
    <article
      aria-labelledby="recibo-titulo"
      className="mx-auto w-full max-w-content rounded-lg border border-t-4 border-line border-t-primary bg-surface px-5 py-8 text-fg sm:px-10 print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0"
    >
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-primary pb-5">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-12 shrink-0 items-center rounded-xs border-2 border-primary-ink px-3 font-serif text-subtitle text-primary-ink"
          >
            {receipt.institution.short_name}
          </span>
          <div className="grid min-w-0 gap-0.5">
            <p className="font-serif text-subtitle text-fg">{receipt.institution.name}</p>
            <p className="text-small text-fg-muted">{texts.appName}</p>
          </div>
        </div>
        <div className="grid gap-0.5 sm:text-right">
          <h2 id="recibo-titulo" className="font-serif text-title text-fg">
            {texts.heading}
          </h2>
          <p className="text-overline text-fg-muted uppercase">{texts.folio}</p>
          <Folio value={receipt.folio} className="text-label font-semibold" />
        </div>
      </header>

      <dl className="grid gap-x-6 gap-y-2 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
        {details.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-overline text-fg-muted uppercase sm:pt-1">{row.label}</dt>
            <dd className="text-body font-semibold text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mb-2 text-overline text-fg-muted uppercase sm:hidden print:hidden">
        {texts.concepts}
      </p>
      <ul className="divide-y divide-line border-y border-line sm:hidden print:hidden">
        {receipt.lines.map((line) => (
          <li key={`${line.assignment_id}-${line.hourly_rate}`} className="grid gap-1 py-3">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-semibold text-fg">
                {formatSubjectWithGroup(line.subject_name, line.group)}
              </p>
              <Money amount={line.amount} className="font-semibold" />
            </div>
            <p className="text-small text-fg-muted">{line.career_name}</p>
            <p className="text-small text-fg-muted figures">
              <Hours value={line.hours} /> × <Money amount={line.hourly_rate} />
            </p>
          </li>
        ))}
      </ul>

      <Table className="hidden sm:table print:table">
        <TableCaption className="text-left text-overline text-fg-muted uppercase">
          {texts.concepts}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{texts.columns.subject}</TableHead>
            <TableHead>{texts.columns.career}</TableHead>
            <TableHead className="text-right">{texts.columns.hours}</TableHead>
            <TableHead className="text-right">{texts.columns.rate}</TableHead>
            <TableHead className="text-right">{texts.columns.amount}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipt.lines.map((line) => (
            <TableRow key={`${line.assignment_id}-${line.hourly_rate}`}>
              <TableCell className="font-medium">
                {formatSubjectWithGroup(line.subject_name, line.group)}
              </TableCell>
              <TableCell>{line.career_name}</TableCell>
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

      <div className="mt-4 ml-auto grid w-full gap-1 sm:w-1/2 print:w-1/2">
        <div className="flex justify-between gap-6 text-body">
          <span>{texts.totalHours}</span>
          <Hours value={receipt.total_hours} />
        </div>
        <div className="flex justify-between gap-6 border-b-2 border-primary pb-2 text-subtitle">
          <span>{texts.total}</span>
          <Money amount={receipt.total_amount} />
        </div>
      </div>

      <div className="mt-6 grid gap-1 rounded-md bg-surface-sunken px-4 py-3">
        <p className="text-overline text-fg-muted uppercase">{texts.words}</p>
        <p className="text-body font-semibold text-fg">{receipt.total_amount_words}</p>
      </div>
      <p className="mt-3 text-small text-fg-muted">{texts.grossNote}</p>

      <div className="mt-20 grid gap-12 sm:grid-cols-2 print:grid-cols-2">
        {[
          { name: receipt.teacher.full_name, caption: texts.signTeacher },
          { name: "", caption: texts.signAuthorizes },
        ].map((signature) => (
          <div key={signature.caption} className="grid gap-0.5 border-t border-fg pt-2 text-center">
            <p className="min-h-5 text-label font-semibold text-fg">{signature.name}</p>
            <p className="text-small text-fg-muted">{signature.caption}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
