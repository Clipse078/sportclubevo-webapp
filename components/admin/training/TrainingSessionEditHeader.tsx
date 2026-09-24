import Link from "next/link";
import { CalendarDays, Layers } from "lucide-react";

type Props = {
  title: string;
  scheduleContext: string;
  seriesEditHref: string;
  wochenplanerHref: string;
  toSeriesLabel: string;
  wochenplanerLabel: string;
};

export default function TrainingSessionEditHeader({
  title,
  scheduleContext,
  seriesEditHref,
  wochenplanerHref,
  toSeriesLabel,
  wochenplanerLabel,
}: Props) {
  return (
    <header
      className="space-y-3 border-b border-[var(--border)] pb-5"
      data-testid="training-session-edit-header"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
          <p className="text-sm text-[var(--text-2)]" data-testid="training-session-edit-schedule-context">
            {scheduleContext}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={seriesEditHref}
            className="fca-button-secondary inline-flex items-center gap-1.5 text-xs sm:text-sm"
            data-testid="training-session-edit-series-link"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            {toSeriesLabel}
          </Link>
          <Link
            href={wochenplanerHref}
            className="fca-button-secondary inline-flex items-center gap-1.5 text-xs sm:text-sm"
            data-testid="training-session-edit-wochenplaner-link"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {wochenplanerLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
