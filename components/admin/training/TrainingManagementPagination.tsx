import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { TrainingManagementPaginationNavigation } from "@/lib/training/management-pagination";

type Props = {
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  navigation: TrainingManagementPaginationNavigation;
};

export default function TrainingManagementPagination({
  page,
  pageCount,
  rangeStart,
  rangeEnd,
  totalCount,
  navigation,
}: Props) {
  if (totalCount === 0) return null;

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
        {navigation.previousHref === null ? (
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] opacity-40"
            aria-hidden="true"
          >
            <ChevronLeft className="h-4 w-4" />
          </span>
        ) : (
          <Link
            href={navigation.previousHref}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--text-2)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sce-primary)]"
            aria-label="Vorherige Seite"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}

        {navigation.pageLinks.map(({ page: pageNumber, href }) => (
          <Link
            key={pageNumber}
            href={href}
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

        {navigation.nextHref === null || page >= pageCount ? (
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] opacity-40"
            aria-hidden="true"
          >
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link
            href={navigation.nextHref}
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
