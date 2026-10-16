"use client";

import {
  derivePlannerOperationalStatus,
  plannerOperationalIssueSummaryLabel,
} from "@/lib/planning-hub/planner-operational-status";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type Props = {
  item: WeekplannerItem;
  testId?: string;
};

/** Visible on-card operational summary — not hover-dependent. */
export default function PlannerOperationalIssueSummary({ item, testId }: Props) {
  const status = derivePlannerOperationalStatus(item);
  const label = plannerOperationalIssueSummaryLabel(status);
  if (!label) return null;

  return (
    <p
      className="text-[11px] font-semibold leading-snug text-amber-900 dark:text-amber-200"
      data-testid={testId ?? "planning-hub-liste-operational-summary"}
      aria-label={`Planungsstatus: ${label.replace(/^⚠\s*/, "")}`}
    >
      {label}
    </p>
  );
}
