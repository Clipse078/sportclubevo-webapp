import { cn } from "@/lib/cn";

export type ActivityContextBadgeProps = {
  children: string;
  className?: string;
};

/** Neutral home/away/venue context — not an activity type color. */
export function ActivityContextBadge({ children, className }: ActivityContextBadgeProps) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[0.625rem] font-medium normal-case tracking-normal text-[var(--text-2)]",
        className,
      )}
      data-activity-context-badge
    >
      {children}
    </span>
  );
}
