"use client";

import { cn } from "@/lib/cn";
import { listOperationalRowStatus, listOperationalStatusLabel } from "@/lib/planning-hub/list-operational";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

export function PlanningHubListeOperationalReadinessPill({ item }: { item: WeekplannerItem }) {
  const status = listOperationalRowStatus(item);
  const label = listOperationalStatusLabel(status);
  const tone =
    status === "ready"
      ? "ready"
      : status === "conflict" || status === "incomplete" || status === "open"
        ? "open"
        : "neutral";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold",
        tone === "ready" && "bg-emerald-500/15 text-emerald-400",
        tone === "open" && "bg-amber-500/15 text-amber-400",
        tone === "neutral" && "bg-[var(--surface-2)] text-[var(--muted)]",
      )}
      data-testid={`planning-hub-liste-readiness-${item.id}`}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "ready" && "bg-emerald-400",
          tone === "open" && "bg-amber-400",
          tone === "neutral" && "bg-[var(--muted)]",
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
