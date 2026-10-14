"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Calendar, CalendarDays, Clock, MapPin, MoreHorizontal, Pencil } from "lucide-react";
import { PopoverContent } from "@/components/ui/Popover";
import TrainingSessionCancelButton from "./TrainingSessionCancelButton";
import { buildTrainingSeriesEditHref } from "@/lib/training/series-cockpit";
import type { TrainingSessionManagementRow as Row } from "@/lib/training/management-session-view";
import { SceTrainingCard } from "@/components/sporting-activity/SceTrainingCard";
import { resolveSceTrainingPresentationFromSessionManagementRow } from "@/lib/sporting-activity-presentation/canonical/adapters/training-session-management";
import { formatSceActivityLocationHierarchy } from "@/lib/sporting-activity-presentation/canonical";
import { formatSportingActivityTimeRange } from "@/lib/sporting-activity-presentation/time-range";
import { cn } from "@/lib/cn";

type Props = {
  row: Row;
  wochenplanerHref: string;
  canManage: boolean;
  locale: string;
  timezone: string;
  tenantClubName?: string | null;
};

function formatShortDate(date: string, locale: string, timezone: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
  }).format(parsed);
}

function formatTimeRange(startAt: string, endAt: string, locale: string, timezone: string): string {
  const fmt = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: timezone });
  return (
    formatSportingActivityTimeRange({
      startLabel: fmt.format(new Date(startAt)),
      endLabel: fmt.format(new Date(endAt)),
    }) ?? fmt.format(new Date(startAt))
  );
}

function statusClasses(status: Row["displayStatus"]): string {
  switch (status) {
    case "AUSNAHME":
      return "border-amber-200/80 bg-amber-500/10 text-amber-300";
    case "ABGESAGT":
      return "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]";
    default:
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }
}

const GRID =
  "grid grid-cols-1 gap-2 border-b border-[var(--border)] px-3 py-3 last:border-b-0 md:grid-cols-[minmax(4.5rem,0.55fr)_minmax(0,1.25fr)_minmax(5.5rem,0.7fr)_minmax(0,1fr)_5rem_2.5rem] md:items-center md:gap-x-3";

export default function TrainingSessionManagementRow({
  row,
  wochenplanerHref,
  canManage,
  locale,
  timezone,
  tenantClubName = "",
}: Props) {
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isCancelled = row.status !== "SCHEDULED";
  const fmtCfg = { locale, timezone };
  const sceModel = resolveSceTrainingPresentationFromSessionManagementRow(row, tenantClubName ?? "");
  const locationLine =
    formatSceActivityLocationHierarchy(sceModel.location, { includeHostClub: false }) ||
    row.facilityLabel ||
    "—";
  const statusLabel =
    row.displayStatus === "GEPLANT" ? "Geplant" : row.displayStatus === "AUSNAHME" ? "Ausnahme" : "Abgesagt";

  return (
    <article
      className={GRID}
      data-testid={`training-session-row-${row.sessionId}`}
      data-sce-training-session-list-row
    >
      <p className="text-sm font-medium text-[var(--foreground)]">{formatShortDate(row.date, locale, timezone)}</p>
      <div className="min-w-0" data-testid="training-session-row-identity">
        <SceTrainingCard
          model={sceModel}
          density="COMPACT"
          fmtCfg={fmtCfg}
          linkToDetail={false}
          showStatus={false}
          surface="list-row"
          className="border-0 bg-transparent p-0 shadow-none"
          testId={`training-session-sce-card-${row.sessionId}`}
        />
        <p className="mt-0.5 truncate text-xs text-[var(--text-2)]">{row.contextLabel}</p>
        {row.displayStatus === "AUSNAHME" && row.exceptionReasons.length > 0 ? (
          <p className="text-[0.65rem] text-amber-700">{row.exceptionReasons.join(" · ")}</p>
        ) : null}
      </div>
      <p
        className="inline-flex min-w-0 items-center gap-1 text-sm tabular-nums text-[var(--foreground)]"
        data-testid="training-session-row-time"
      >
        <Clock className="hidden h-3.5 w-3.5 shrink-0 opacity-70 md:inline" aria-hidden />
        <span>{formatTimeRange(row.startAt, row.endAt, locale, timezone)}</span>
      </p>
      <p
        className="inline-flex min-w-0 items-center gap-1 truncate text-sm text-[var(--text-2)]"
        data-testid="training-session-row-location"
      >
        <MapPin className="hidden h-3.5 w-3.5 shrink-0 opacity-70 md:inline" aria-hidden />
        <span className="truncate">{locationLine}</span>
      </p>
      <span
        className={cn(
          "inline-flex h-5 w-fit items-center rounded-full border px-2 text-[0.62rem] font-semibold",
          statusClasses(row.displayStatus),
        )}
        data-testid="training-session-row-status"
      >
        {statusLabel}
      </span>
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/dashboard/training/sessions/${row.sessionId}/edit`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white hover:bg-[var(--surface-2)]"
          aria-label="Termin bearbeiten"
          data-testid={`training-session-edit-${row.sessionId}`}
        >
          <Pencil className="h-3.5 w-3.5 text-[var(--blue)]" />
        </Link>
        <button
          ref={menuRef}
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-white hover:bg-[var(--surface-2)]"
          aria-label="Weitere Aktionen"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <PopoverContent open={menuOpen} onOpenChange={setMenuOpen} anchorRef={menuRef} matchAnchorWidth={false}>
          <div className="min-w-52 py-1 text-sm">
            <Link
              href={`/dashboard/training/sessions/${row.sessionId}/edit`}
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              onClick={() => setMenuOpen(false)}
            >
              Termin bearbeiten
            </Link>
            <Link
              href={buildTrainingSeriesEditHref(row.trainingSeriesId)}
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              onClick={() => setMenuOpen(false)}
            >
              Serie bearbeiten
            </Link>
            <Link
              href={wochenplanerHref}
              className="block px-3 py-2 hover:bg-[var(--surface-2)]"
              onClick={() => setMenuOpen(false)}
            >
              Im Wochenplaner anzeigen
            </Link>
            {canManage && row.status === "SCHEDULED" ? (
              <div className="border-t border-[var(--border)] px-3 py-2">
                <TrainingSessionCancelButton sessionId={row.sessionId} isCancelled={false} />
              </div>
            ) : null}
            {canManage && isCancelled ? (
              <div className="border-t border-[var(--border)] px-3 py-2">
                <TrainingSessionCancelButton sessionId={row.sessionId} isCancelled />
              </div>
            ) : null}
          </div>
        </PopoverContent>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <CalendarDays className="h-3.5 w-3.5 text-[var(--muted)]" />
        <Link href={wochenplanerHref} className="text-xs font-medium text-[var(--blue)]">
          Wochenplaner
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)] md:hidden">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 opacity-70" aria-hidden />
          {formatShortDate(row.date, locale, timezone)}
        </span>
      </div>
    </article>
  );
}
