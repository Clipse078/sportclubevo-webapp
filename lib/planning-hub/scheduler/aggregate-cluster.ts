import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { schedulerDisplayIdentity } from "@/lib/planning-hub/scheduler-display-label";
import { weekplannerActivityTypeLabel } from "@/lib/planning-hub/item-presenters";

export type AggregateClusterSummary = {
  activityCount: number;
  typeLabel: string;
  identityPreview: string;
  conflictCount: number;
};

export function summarizeAggregateCluster(items: readonly WeekplannerItem[]): AggregateClusterSummary {
  const activityCount = items.length;
  const typeCounts = new Map<string, number>();
  for (const item of items) {
    const label = weekplannerActivityTypeLabel(item.type);
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
  }
  const dominantType =
    [...typeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
    "Aktivitäten";

  const identities = [...new Set(items.map((item) => schedulerDisplayIdentity(item)))].sort((a, b) =>
    a.localeCompare(b, "de-CH"),
  );
  const preview =
    identities.length <= 4
      ? identities.join(" · ")
      : `${identities.slice(0, 3).join(" · ")} · +${identities.length - 3}`;

  const conflictCount = items.filter((item) => item.conflicts.length > 0).length;

  return {
    activityCount,
    typeLabel: dominantType,
    identityPreview: preview,
    conflictCount,
  };
}
