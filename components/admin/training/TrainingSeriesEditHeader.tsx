import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/cn";

type MetaChip = { key: string; label: string; className?: string };

type Props = {
  title: string;
  teamDisplayName: string;
  wochenplanerHref: string;
  statusLabel: string;
  scheduleRail: string | null;
  pitchLabel: string | null;
  dressingRoomLabel: string | null;
};

export default function TrainingSeriesEditHeader({
  title,
  teamDisplayName,
  wochenplanerHref,
  statusLabel,
  scheduleRail,
  pitchLabel,
  dressingRoomLabel,
}: Props) {
  const chips: MetaChip[] = [{ key: "status", label: statusLabel }];
  if (scheduleRail) chips.push({ key: "schedule", label: scheduleRail });
  if (pitchLabel) chips.push({ key: "pitch", label: pitchLabel, className: "text-emerald-300/90" });
  if (dressingRoomLabel) {
    chips.push({ key: "dressing", label: dressingRoomLabel, className: "text-[var(--blue)]" });
  }

  return (
    <header
      className="space-y-3 border-b border-[var(--border)] pb-5"
      data-testid="training-series-edit-header"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Training bearbeiten</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
          <p className="text-sm text-[var(--text-2)]">{teamDisplayName}</p>
        </div>
        <Link
          href={wochenplanerHref}
          className="fca-button-secondary inline-flex items-center gap-1.5 text-xs sm:text-sm"
          data-testid="training-series-edit-wochenplaner-link"
        >
          <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
          Im Wochenplaner anzeigen
        </Link>
      </div>

      {chips.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-2)]"
          data-testid="training-series-edit-meta-rail"
        >
          {chips.map((chip, index) => (
            <span key={chip.key} className="inline-flex items-center gap-2">
              {index > 0 ? (
                <span className="text-[var(--muted)]" aria-hidden="true">
                  ·
                </span>
              ) : null}
              <span className={cn("font-medium text-[var(--foreground)]", chip.className)}>{chip.label}</span>
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}
