type StrategyProgressIndicatorProps = {
  label: string;
  percent: number | null;
  unknownReason: string | null;
  accentClass?: string;
  testId?: string;
};

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

export default function StrategyProgressIndicator({
  label,
  percent,
  unknownReason,
  accentClass = "bg-[var(--sce-primary)]",
  testId,
}: StrategyProgressIndicatorProps) {
  if (percent == null) {
    return (
      <div data-testid={testId}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--text-2)]">{label}</span>
          <span className="text-xs font-semibold text-[var(--muted)]">—</span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--muted)]">{unknownReason ?? "Nicht verfügbar."}</p>
      </div>
    );
  }

  const width = Math.min(100, Math.max(0, percent));

  return (
    <div data-testid={testId}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--text-2)]">{label}</span>
        <span className="text-xs font-semibold text-[var(--foreground)]">{formatPercent(percent)}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-2)]">
        <div className={`h-2 rounded-full ${accentClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}