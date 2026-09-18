import Link from "next/link";
import { CalendarRange, Layers, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  seriesTitle: string;
  seriesScheduleLine: string;
  seriesEditHref: string;
  matchesSeriesStandard: boolean;
  overrideStatusLabel: string;
  occurrenceScheduleLine: string;
  wochenplanerHref: string;
  teamLabel: string;
  pitchLabel: string | null;
  dressingRoomCodes: string[];
};

export default function TrainingSessionRecordContextRail({
  seriesTitle,
  seriesScheduleLine,
  seriesEditHref,
  matchesSeriesStandard,
  overrideStatusLabel,
  occurrenceScheduleLine,
  wochenplanerHref,
  teamLabel,
  pitchLabel,
  dressingRoomCodes,
}: Props) {
  return (
    <div
      className="space-y-4 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/60 p-4 text-sm"
      data-testid="training-session-record-context-rail"
    >
      <div className="space-y-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
          Trainingsserie
        </p>
        <p className="font-medium text-[var(--foreground)]">{seriesTitle}</p>
        <p className="text-xs text-[var(--text-2)]">{seriesScheduleLine}</p>
        <Link
          href={seriesEditHref}
          className="fca-button-secondary inline-flex w-full items-center justify-center gap-1.5 text-xs"
          data-testid="training-session-rail-series-link"
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          Zur Serie
        </Link>
      </div>

      <div className="space-y-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Status</p>
        <p className="font-medium text-[var(--foreground)]">Geplant</p>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold",
            matchesSeriesStandard
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25"
              : "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/25",
          )}
          data-testid="training-session-rail-override-status"
        >
          {overrideStatusLabel}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">
          Wochenplaner
        </p>
        <p className="text-xs text-[var(--text-2)]">{occurrenceScheduleLine}</p>
        <Link
          href={wochenplanerHref}
          className="fca-button-secondary inline-flex w-full items-center justify-center gap-1.5 text-xs"
          data-testid="training-session-rail-wochenplaner"
        >
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          Im Wochenplaner
        </Link>
      </div>

      <div className="space-y-1">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Team</p>
        <p className="font-medium text-[var(--foreground)]">{teamLabel}</p>
      </div>

      {pitchLabel ? (
        <div className="space-y-1">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]">Anlage</p>
          <p className="inline-flex items-center gap-1.5 text-[var(--text-2)]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400/90" aria-hidden />
            {pitchLabel}
          </p>
          {dressingRoomCodes.length > 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Garderobe · {dressingRoomCodes.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
