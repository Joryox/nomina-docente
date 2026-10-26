"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { TEXTS } from "@/constants/texts";
import { pageBounds, paginationRange } from "@/lib/pagination";
import { cn } from "@/lib/utils";

import { Button } from "./button";

const texts = TEXTS.ui.pagination;

/** Los campos del sobre de paginación del backend (`page`, `page_size`, `total`, `total_pages`). */
export interface PaginationState {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

interface PaginationProps extends PaginationState {
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  page_size: pageSize,
  total,
  total_pages: totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  const { from, to } = pageBounds(page, pageSize, total);

  return (
    <nav
      aria-label={texts.label}
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
    >
      <p className="text-small text-fg-muted figures" aria-live="polite">
        {texts.summary(from, to, total)}
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
            {texts.previous}
          </Button>
          <ol className="hidden items-center gap-1 sm:flex">
            {paginationRange(page, totalPages).map((item, index) =>
              item === "gap" ? (
                <li key={`hueco-${index}`} aria-hidden="true" className="px-1 text-fg-muted">
                  …
                </li>
              ) : (
                <li key={item}>
                  <Button
                    variant={item === page ? "secondary" : "ghost"}
                    size="icon-sm"
                    aria-label={texts.page(item)}
                    aria-current={item === page ? "page" : undefined}
                    onClick={() => onPageChange(item)}
                    className="figures"
                  >
                    {item}
                  </Button>
                </li>
              ),
            )}
          </ol>
          <span className="px-2 text-small text-fg-muted figures sm:hidden">
            {texts.current(page, totalPages)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            {texts.next}
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
