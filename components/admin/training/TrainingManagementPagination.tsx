"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  buildPageHref: (page: number) => string;
};

function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return [...pages].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
}

export default function TrainingManagementPagination({
  page,
  pageCount,
  rangeStart,
  rangeEnd,
  totalCount,
  buildPageHref,
}: Props) {
  if (totalCount === 0) return null;

  const pages = pageNumbers(page, pageCount);

  return (
    <nav
      className="flex flex-col gap-3 border-t border-[var(--border)]/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Trainings paginieren"
      data-testid="training-management-pagination"
    >
      <p className="text-sm text-[var(--text-2)]">
        {rangeStart}–{rangeEnd} von {totalCount} Trainings
      </p>

      <div className="flex items-center gap-1">
        {page <= 1 ? (
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] opacity-40"
            aria-hidden="true"
          >
            <ChevronLeft className="h-4 w-4" />
          </span>
        ) : (
          <Link
            href={buildPageHref(page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--text-2)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            aria-label="Vorherige Seite"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}

        {pages.map((pageNumber) => (
          <Link
            key={pageNumber}
            href={buildPageHref(pageNumber)}
            aria-label={`Seite ${pageNumber}`}
            aria-current={pageNumber === page ? "page" : undefined}
            className={cn(
              "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]",
              pageNumber === page
                ? "border border-[var(--sce-primary)]/60 bg-[var(--sce-primary)]/10 font-semibold text-[var(--foreground)]"
                : "border border-transparent text-[var(--text-2)] hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            {pageNumber}
          </Link>
        ))}

        {page >= pageCount ? (
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] opacity-40"
            aria-hidden="true"
          >
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link
            href={buildPageHref(page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--text-2)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            aria-label="Nächste Seite"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
