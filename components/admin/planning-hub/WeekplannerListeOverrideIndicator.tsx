"use client";

import {
  formatWeekplannerStandardPlanSummary,
  isWeekplannerItemPlanOverridden,
} from "@/lib/weekplanner/item-plan-overrides";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

type WeekplannerListeOverrideIndicatorProps = {
  item: WeekplannerItem;
  planName: string;
  locale: string;
  timezone: string;
};

export default function WeekplannerListeOverrideIndicator({
  item,
  planName,
  locale,
  timezone,
}: WeekplannerListeOverrideIndicatorProps) {
  if (!isWeekplannerItemPlanOverridden(item)) {
    return null;
  }

  const trimmedPlan = planName.trim();
  if (!trimmedPlan) {
    return null;
  }

  return (
    <div className="mt-1 space-y-0.5" data-testid="weekplanner-override-indicator">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
        {trimmedPlan} angepasst
      </p>
      <p className="text-[10px] text-[var(--muted)]">
        Standard: {formatWeekplannerStandardPlanSummary(item, locale, timezone)}
      </p>
    </div>
  );
}
