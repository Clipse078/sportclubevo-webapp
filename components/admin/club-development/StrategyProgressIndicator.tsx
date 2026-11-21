import { cn } from "@/lib/cn";

type StrategyProgressIndicatorProps = {
  label: string;
  percent: number | null;
  unknownReason: string | null;
  /** Shown under the bar and exposed via aria-valuetext when percent is set. */
  countCaption?: string | null;
  accentClass?: string;
  testId?: string;
  /** List rows: bar + percent on one line, dash for empty. Detail: stacked layout. */
  variant?: "detail" | "compact";
  /** When compact and empty, show reason text under the dash (detail surfaces). */
  showEmptyReason?: boolean;
  className?: string;
};

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

export default function StrategyProgressIndicator({
  label,
  percent,
  unknownReason,
  countCaption = null,
  accentClass = "bg-[var(--sce-primary)]",
  testId,
  variant = "detail",
  showEmptyReason = false,
  className,
}: StrategyProgressIndicatorProps) {
  if (variant === "compact") {
    if (percent == null) {
      return (
        <div data-testid={testId} className={cn("min-w-0", className)}>
          <span className="text-xs font-semibold text-[var(--muted)] tabular-nums" aria-hidden>
            —
          </span>
          <span className="sr-only">
            {label}: {unknownReason ?? "Nicht verfügbar."}
          </span>
          {showEmptyReason && unknownReason ? (
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{unknownReason}</p>
          ) : null}
        </div>
      );
    }

    const width = Math.min(100, Math.max(0, percent));
    const ariaValueText =
      countCaption?.trim() ||
      (unknownReason?.trim() ? unknownReason : `${label}: ${formatPercent(percent)}`);

    return (
      <div data-testid={testId} className={cn("flex min-w-0 items-center gap-2", className)}>
        <div
          className="h-1.5 min-w-[2.75rem] max-w-[5.5rem] flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--surface-2)_85%,transparent)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={width}
          aria-label={label}
          aria-valuetext={ariaValueText}
        >
          <div className={cn("h-full rounded-full", accentClass)} style={{ width: `${width}%` }} />
        </div>
        <span className="shrink-0 text-xs font-semibold text-[var(--foreground)] tabular-nums" aria-hidden>
          {formatPercent(percent)}
        </span>
        <span className="sr-only">{ariaValueText}</span>
      </div>
    );
  }

  if (percent == null) {
    return (
      <div data-testid={testId} className={className}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--text-2)]">{label}</span>
          <span className="text-xs font-semibold text-[var(--muted)]">—</span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--muted)]">{unknownReason ?? "Nicht verfügbar."}</p>
      </div>
    );
  }

  const width = Math.min(100, Math.max(0, percent));
  const ariaValueText =
    countCaption?.trim() ||
    (unknownReason?.trim() ? unknownReason : `${label}: ${formatPercent(percent)}`);

  return (
    <div data-testid={testId} className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--text-2)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--foreground)] tabular-nums">{formatPercent(percent)}</span>
      </div>
      {countCaption ? <p className="mb-1.5 text-[11px] text-[var(--muted)]">{countCaption}</p> : null}
      <div
        className="h-2 rounded-full bg-[var(--surface-2)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-label={label}
        aria-valuetext={ariaValueText}
      >
        <div className={`h-2 rounded-full ${accentClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}