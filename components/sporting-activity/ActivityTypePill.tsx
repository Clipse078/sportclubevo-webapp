import { cn } from "@/lib/cn";
import {
  resolveSportingActivityColorToken,
  sportingActivityColorClassName,
} from "@/lib/sporting-activity-design/activity-color-tokens";
import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";

export type ActivityTypePillProps = {
  activityKind: SportingActivityKind;
  label: string;
  className?: string;
};

/** Semantic activity type pill — uses canonical color tokens (Training blue, Spiel red, Turnier orange). */
export function ActivityTypePill({ activityKind, label, className }: ActivityTypePillProps) {
  const variant = resolveSportingActivityColorToken(activityKind);
  const colorClass =
    sportingActivityColorClassName(activityKind) ??
    "inline-flex items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-[var(--muted)]";

  return (
    <span
      className={cn(colorClass, className)}
      data-activity-type-pill={variant ?? undefined}
    >
      {label}
    </span>
  );
}
