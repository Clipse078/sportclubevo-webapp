import Link from "next/link";
import { cn } from "@/lib/cn";
import type { TrainingSessionRowViewModel } from "@/lib/training/view-model";
import type { TrainingAllocationSummary } from "@/lib/training/operational-state";
import { SessionReadinessBadge } from "./training-center-ui";
import TrainingSessionRowMenu from "./TrainingSessionRowMenu";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type Props = {
  row: TrainingSessionRowViewModel;
  allocationSummary: TrainingAllocationSummary | undefined;
  canManage: boolean;
  locale?: string;
  timezone?: string;
  showDate?: boolean;
};

function formatTimeRange(startAt: string, endAt: string, locale: string, timezone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: timezone });
  return `${fmt.format(new Date(startAt))}–${fmt.format(new Date(endAt))}`;
}

function formatShortDate(date: string, locale: string, timezone: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  }).format(parsed);
}

function ResourceHint({
  label,
  present,
  href,
}: {
  label: string;
  present: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex max-w-[9rem] items-center gap-1 truncate text-xs font-medium transition hover:text-[var(--foreground)]",
        present ? "text-[var(--text-2)]" : "text-[var(--sce-warning)]",
      )}
      title={label}
    >
      {present ? (
        <CheckCircle2 className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      ) : (
        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function TrainingSessionRow({
  row,
  allocationSummary,
  canManage,
  locale = "de-CH",
  timezone = "Europe/Zurich",
  showDate = false,
}: Props) {
  const { session, assessment } = row;
  const isCancelled = session.status !== "SCHEDULED";
  const summary = allocationSummary ?? { hasPitchAllocation: false, hasDressingRoomAllocation: false };
  const resourcesHref = `/dashboard/training/series/${session.trainingSeriesId}/allocations`;

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition hover:bg-[var(--surface-2)]/40"
      data-testid="training-session-row"
      data-status={assessment.status}
    >
      <div className="flex min-w-[6.5rem] shrink-0 flex-col">
        {showDate ? (
          <span className="text-[0.68rem] font-medium text-[var(--muted)]">
            {formatShortDate(session.date, locale, timezone)}
          </span>
        ) : null}
        <span className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
          {formatTimeRange(session.startAt, session.endAt, locale, timezone)}
        </span>
      </div>

      <div className="min-w-0 flex-1 basis-[12rem]">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">{session.teamName}</p>
        <p className="truncate text-xs text-[var(--muted)]">{session.trainingSeriesTitle}</p>
        {session.isRescheduled && !isCancelled ? (
          <p className="mt-0.5 text-[0.65rem] text-[var(--muted)]" data-testid="training-session-rescheduled-badge">
            Angepasst · Serienstandard {session.originalDate}
          </p>
        ) : null}
      </div>

      {!isCancelled ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <ResourceHint label="Spielfeld/Halle" present={summary.hasPitchAllocation} href={resourcesHref} />
          <ResourceHint label="Garderobe" present={summary.hasDressingRoomAllocation} href={resourcesHref} />
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <SessionReadinessBadge status={assessment.status} />
        <TrainingSessionRowMenu
          sessionId={session.id}
          seriesId={session.trainingSeriesId}
          canManage={canManage}
          isCancelled={isCancelled}
        />
      </div>
    </div>
  );
}
