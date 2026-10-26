"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { TEXTS } from "@/constants/texts";
import { compareText } from "@/lib/search";
import { cn } from "@/lib/utils";

import { Pagination, type PaginationState } from "./pagination";
import { Skeleton } from "./skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const texts = TEXTS.ui.table;

export type SortDirection = "asc" | "desc";

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export interface DataTableColumn<TRow> {
  id: string;
  header: string;
  cell: (row: TRow) => ReactNode;
  /** `end` para cifras (dinero, horas, folios): alineadas a la derecha y tabulares. */
  align?: "start" | "end";
  /** Valor para ordenar; si falta, la columna no se puede ordenar. */
  sortValue?: (row: TRow) => string | number;
  /** En celular: la columna principal es el título de cada tarjeta. */
  primary?: boolean;
  /** En celular: no se muestra (datos secundarios). */
  hideOnMobile?: boolean;
  className?: string;
}

export interface DataTableProps<TRow> {
  columns: readonly DataTableColumn<TRow>[];
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  /** Título accesible de la tabla (se muestra si `captionVisible`). */
  caption: string;
  captionVisible?: boolean;
  loading?: boolean;
  skeletonRows?: number;
  /** Lo que se muestra cuando no hay filas (normalmente un EmptyState). */
  empty: ReactNode;
  /** Orden controlado (p. ej., en el servidor). Sin él, la tabla ordena en el navegador. */
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  defaultSort?: SortState;
  /** Fila de totales (celdas alineadas con las columnas). */
  footer?: ReactNode;
  pagination?: PaginationState & { onPageChange: (page: number) => void };
  className?: string;
}

function sortRows<TRow>(
  rows: readonly TRow[],
  columns: readonly DataTableColumn<TRow>[],
  sort: SortState | null | undefined,
): readonly TRow[] {
  const column = columns.find((candidate) => candidate.id === sort?.columnId);
  if (!sort || !column?.sortValue) {
    return rows;
  }
  const value = column.sortValue;
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((first, second) => {
    const a = value(first);
    const b = value(second);
    const order =
      typeof a === "number" && typeof b === "number" ? a - b : compareText(String(a), String(b));
    return order * factor;
  });
}

/**
 * Tabla de datos del sistema: encabezados ordenables (`aria-sort`), cifras alineadas a la
 * derecha, carga con skeleton, estado vacío útil y paginación con el formato del backend. En
 * celular cada fila se convierte en una tarjeta con etiqueta y valor.
 */
export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  caption,
  captionVisible = false,
  loading = false,
  skeletonRows = 5,
  empty,
  sort: controlledSort,
  onSortChange,
  defaultSort,
  footer,
  pagination,
  className,
}: DataTableProps<TRow>) {
  const [internalSort, setInternalSort] = useState<SortState | null>(defaultSort ?? null);
  const isControlled = controlledSort !== undefined;
  const sort = isControlled ? controlledSort : internalSort;
  const visibleRows = useMemo(
    () => (isControlled ? rows : sortRows(rows, columns, sort)),
    [rows, columns, sort, isControlled],
  );

  const toggleSort = (columnId: string) => {
    const direction: SortDirection =
      sort?.columnId === columnId && sort.direction === "asc" ? "desc" : "asc";
    const next = { columnId, direction };
    if (!isControlled) {
      setInternalSort(next);
    }
    onSortChange?.(next);
  };

  const isEmpty = !loading && rows.length === 0;
  const primaryColumn = columns.find((column) => column.primary) ?? columns[0];

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {/* Escritorio y tableta */}
        <div className="hidden md:block">
          <Table aria-busy={loading || undefined}>
            <TableCaption className={cn(!captionVisible && "sr-only")}>{caption}</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    scope="col"
                    data-align={column.align}
                    aria-sort={
                      sort?.columnId === column.id
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={column.className}
                  >
                    {column.sortValue ? (
                      <SortButton
                        label={column.header}
                        direction={sort?.columnId === column.id ? sort.direction : null}
                        alignEnd={column.align === "end"}
                        onClick={() => toggleSort(column.id)}
                      />
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: skeletonRows }, (_, index) => (
                    <TableRow key={`cargando-${index}`} className="hover:bg-transparent">
                      {columns.map((column) => (
                        <TableCell key={column.id} data-align={column.align}>
                          <Skeleton
                            className={cn("h-4", column.align === "end" ? "ml-auto w-16" : "w-3/4")}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : visibleRows.map((row) => (
                    <TableRow key={getRowId(row)}>
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          data-align={column.align}
                          className={column.className}
                        >
                          {column.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
            </TableBody>
            {footer && !loading && !isEmpty ? <TableFooter>{footer}</TableFooter> : null}
          </Table>
        </div>

        {/* Celular: una tarjeta por fila */}
        <ul
          className="divide-y divide-line md:hidden"
          aria-label={caption}
          aria-busy={loading || undefined}
        >
          {loading
            ? Array.from({ length: Math.min(skeletonRows, 3) }, (_, index) => (
                <li key={`cargando-${index}`} className="grid gap-2 p-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </li>
              ))
            : visibleRows.map((row) => (
                <li key={getRowId(row)} className="grid gap-2 p-4">
                  {primaryColumn ? (
                    <div className="text-label font-semibold text-fg">
                      {primaryColumn.cell(row)}
                    </div>
                  ) : null}
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {columns
                      .filter((column) => column !== primaryColumn && !column.hideOnMobile)
                      .map((column) => (
                        <div key={column.id} className="contents">
                          <dt className="text-small text-fg-muted">{column.header}</dt>
                          <dd
                            className={cn(
                              "text-small text-fg",
                              column.align === "end" && "text-right figures",
                            )}
                          >
                            {column.cell(row)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </li>
              ))}
        </ul>

        {loading ? (
          <p className="sr-only" role="status">
            {texts.loading}
          </p>
        ) : null}
        {isEmpty ? <div className="border-t border-line md:border-t-0">{empty}</div> : null}
      </div>
      {pagination && !isEmpty ? <Pagination {...pagination} /> : null}
    </div>
  );
}

function SortButton({
  label,
  direction,
  alignEnd,
  onClick,
}: {
  label: string;
  direction: SortDirection | null;
  alignEnd: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  const hint = direction === "asc" ? texts.sortDescending : texts.sortAscending;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded-sm px-1 uppercase hover:text-fg",
        alignEnd && "flex-row-reverse",
        direction && "text-fg",
      )}
    >
      {label}
      <Icon aria-hidden="true" className={cn("size-3.5", !direction && "opacity-60")} />
      <span className="sr-only">. {hint}</span>
    </button>
  );
}
