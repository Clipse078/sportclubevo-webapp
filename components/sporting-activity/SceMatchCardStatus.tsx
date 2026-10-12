import { cn } from "@/lib/cn";
import type { SceActivityPresentationStatus } from "@/lib/sporting-activity-presentation/canonical/types";

const SEMANTIC_CLASS: Record<
  NonNullable<SceActivityPresentationStatus["semantic"]>,
  string
> = {
  neutral: "bg-[var(--surface-2)] text-[var(--text-2)]",
  active: "bg-[var(--status-active-bg, rgba(34,197,94,0.12))] text-[var(--status-active-fg,var(--foreground))]",
  planned: "bg-[var(--surface-2)] text-[var(--text-2)]",
  completed: "bg-[var(--surface-2)] text-[var(--text-2)]",
  cancelled: "bg-[var(--surface-2)] text-[var(--muted)] line-through",
  warning: "bg-[var(--surface-2)] text-[var(--foreground)]",
};

export type SceMatchCardStatusProps = {
  status: SceActivityPresentationStatus;
  testId?: string;
  className?: string;
};

/** Lifecycle status — label always visible; colour is supplementary. */
export function SceMatchCardStatus({
  status,
  testId = "sce-match-status",
  className,
}: SceMatchCardStatusProps) {
  const label = status.label?.trim();
  if (!label) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[0.6875rem] font-medium",
        SEMANTIC_CLASS[status.semantic],
        className,
      )}
      data-testid={testId}
      data-semantic={status.semantic}
    >
      {label}
    </span>
  );
}
