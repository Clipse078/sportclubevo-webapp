import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  rangeLabel: string;
  previousWeekHref: string;
  nextWeekHref: string;
  todayHref: string;
  rangeLabelTestId?: string;
};

/**
 * Week-oriented temporal navigation aligned with SpieleManagementMonthCalendar controls.
 */
export default function PlanningWeekNavigation({
  rangeLabel,
  previousWeekHref,
  nextWeekHref,
  todayHref,
  rangeLabelTestId = "weekplanner-range-label",
}: Props) {
  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3"
      aria-label="Wochennavigation"
      data-testid="planning-week-navigation"
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="min-w-0 text-sm font-semibold capitalize text-[var(--foreground)]"
          data-testid={rangeLabelTestId}
        >
          {rangeLabel}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <Link
            href={previousWeekHref}
            aria-label="Vorherige Woche"
            data-testid="weekplanner-previous-week"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={todayHref}
            data-testid="weekplanner-today"
            className="rounded-md px-2 py-1 text-[0.6875rem] font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            Heute
          </Link>
          <Link
            href={nextWeekHref}
            aria-label="Nächste Woche"
            data-testid="weekplanner-next-week"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
