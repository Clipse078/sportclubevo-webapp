import Link from "next/link";
import { ArrowLeft, CalendarDays, Layers } from "lucide-react";

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  scheduleContext: string;
  seriesEditHref: string;
  wochenplanerHref: string;
  toSeriesLabel: string;
  wochenplanerLabel: string;
};

export default function TrainingSessionEditHeader({
  backHref,
  backLabel,
  title,
  scheduleContext,
  seriesEditHref,
  wochenplanerHref,
  toSeriesLabel,
  wochenplanerLabel,
}: Props) {
  return (
    <header
      className="space-y-2 border-b border-[var(--border)] pb-3"
      data-testid="training-session-edit-header"
    >
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-2)] transition hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        data-testid="training-session-edit-back-link"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
          <p className="text-sm text-[var(--text-2)]" data-testid="training-session-edit-schedule-context">
            {scheduleContext}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={seriesEditHref}
            className="fca-button-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
            data-testid="training-session-edit-series-link"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            {toSeriesLabel}
          </Link>
          <Link
            href={wochenplanerHref}
            className="fca-button-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
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
