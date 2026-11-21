import { cn } from "@/lib/cn";
import {
  type SceCompletionCountSuffix,
  sceCompletionFromCaption,
} from "@/lib/club-development/sce-completion-progress";

export type SceCompletionProgressInlineProps = {
  metricLabel: string;
  countCaption?: string | null;
  emptyLabel: string;
  countSuffix?: SceCompletionCountSuffix;
  completedCount?: number | null;
  totalCount?: number | null;
  accentClass?: string;
  testId?: string;
  className?: string;
};

export default function SceCompletionProgressInline({
  metricLabel,
  countCaption = null,
  emptyLabel,
  countSuffix = "erledigt",
  completedCount = null,
  totalCount = null,
  accentClass = "bg-[var(--sce-primary)]",
  testId,
  className,
}: SceCompletionProgressInlineProps) {
  const derived =
    completedCount != null && totalCount != null && totalCount > 0
      ? (() => {
          const inlineCaption = `${computeFloorPercent(completedCount, totalCount)}% – ${completedCount} von ${totalCount} ${countSuffix}`;
          return {
            empty: false,
            displayPercent: computeFloorPercent(completedCount, totalCount),
            barPercent: Math.min(100, (completedCount / totalCount) * 100),
            inlineCaption,
            ariaValueText: `${metricLabel}: ${inlineCaption}`,
          };
        })()
      : (() => {
          const parsed = sceCompletionFromCaption(countCaption, emptyLabel, countSuffix);
          return {
            empty: parsed.empty,
            displayPercent: parsed.displayPercent,
            barPercent: parsed.barPercent,
            inlineCaption: parsed.inlineCaption,
            ariaValueText: `${metricLabel}: ${parsed.ariaValueText}`,
          };
        })();

  if (derived.empty) {
    return (
      <div data-testid={testId} className={cn("min-w-0 text-xs text-[var(--muted)]", className)}>
        <span aria-hidden>—</span>
        <span className="sr-only">{derived.ariaValueText}</span>
      </div>
    );
  }

  const barWidth = derived.barPercent;

  return (
    <div
      data-testid={testId}
      className={cn("flex min-w-0 items-center gap-2 text-xs text-[var(--foreground)]", className)}
    >
      <div
        className="h-1.5 w-[4.5rem] shrink-0 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--surface-2)_85%,transparent)] sm:w-[5.5rem]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(barWidth)}
        aria-label={metricLabel}
        aria-valuetext={derived.ariaValueText}
      >
        <div className={cn("h-full rounded-full", accentClass)} style={{ width: `${barWidth}%` }} />
      </div>
      <span className="min-w-0 truncate font-medium tabular-nums" aria-hidden>
        {derived.inlineCaption}
      </span>
      <span className="sr-only">{derived.ariaValueText}</span>
    </div>
  );
}

function computeFloorPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  if (completed >= total) return 100;
  return Math.floor((completed / total) * 100);
}