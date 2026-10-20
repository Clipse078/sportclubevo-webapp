"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { SceIconButton } from "@/components/sce/actions/SceIconButton";

export type SceDensePaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  className?: string;
  "data-testid"?: string;
};

function rangeLabel(page: number, pageSize: number, totalItems: number): string {
  if (totalItems === 0) return "0 Einträge";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return `${start}–${end} von ${totalItems}`;
}

export function SceDensePagination({
  page,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
  className,
  "data-testid": testId = "sce-dense-pagination",
}: SceDensePaginationProps) {
  const canPrev = page > 1;
  const canNext = page < pageCount;

  if (pageCount <= 1 && totalItems <= pageSize) return null;

  return (
    <nav
      aria-label="Seitennavigation"
      data-sce-dense-pagination="true"
      data-testid={testId}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3 md:px-5",
        className,
      )}
    >
      <p className="text-sm text-[var(--muted)]" role="status">
        {rangeLabel(page, pageSize, totalItems)}
      </p>
      <div className="flex items-center gap-1">
        <SceIconButton
          aria-label="Vorherige Seite"
          icon={<ChevronLeft className="h-4 w-4" />}
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          size="sm"
          variant="secondary"
        />
        <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-[var(--text-2)]">
          {page} / {Math.max(pageCount, 1)}
        </span>
        <SceIconButton
          aria-label="Nächste Seite"
          icon={<ChevronRight className="h-4 w-4" />}
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          size="sm"
          variant="secondary"
        />
      </div>
    </nav>
  );
}
