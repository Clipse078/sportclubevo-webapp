import { cn } from "@/lib/cn";
import type { SceCdOverviewGridColumn } from "./sce-club-development-surface-styles";

type Props = {
  reference: string | null;
  testId?: string;
  className?: string;
  dataSceOverviewCol?: SceCdOverviewGridColumn;
};

export default function VereinsentwicklungBacklogReferenceCell({
  reference,
  testId,
  className,
  dataSceOverviewCol,
}: Props) {
  if (!reference?.trim()) {
    return (
      <span
        data-testid={testId}
        data-sce-overview-col={dataSceOverviewCol}
        className={cn("text-xs text-[var(--muted)]", className)}
        aria-hidden
      >
        —
      </span>
    );
  }
  return (
    <span
      data-testid={testId}
      data-sce-overview-col={dataSceOverviewCol}
      className={cn(
        "min-w-0 truncate font-mono text-[0.68rem] font-medium tabular-nums tracking-tight text-[var(--text-2)]",
        className,
      )}
      title={reference}
    >
      {reference}
    </span>
  );
}