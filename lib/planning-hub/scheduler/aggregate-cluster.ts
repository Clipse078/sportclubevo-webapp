import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { schedulerDisplayIdentity } from "@/lib/planning-hub/scheduler-display-label";
import { weekplannerActivityTypeLabel } from "@/lib/planning-hub/item-presenters";
import { weekplannerMatchRequiresEndTimeAction } from "@/lib/planning-hub/match-operational-presenters";

export type AggregateClusterSummary = {
  activityCount: number;
  headline: string;
  identityPreview: string;
  conflictCount: number;
  endTimeActionCount: number;
  timeLabel: string | null;
  conflictLabel: string | null;
  endTimeActionLabel: string | null;
};

function pluralActivityTypeLabel(dominantType: string, count: number): string {
  if (count === 1) return dominantType;
  if (dominantType === "Training") return "Trainings";
  if (dominantType === "Spiel") return "Spiele";
  if (dominantType === "Turnier") return "Turniere";
  if (dominantType === "Veranstaltung") return "Veranstaltungen";
  return `${dominantType}`;
}

export function summarizeAggregateCluster(
  items: readonly WeekplannerItem[],
  timeLabel?: string | null,
): AggregateClusterSummary {
  const activityCount = items.length;
  const typeCounts = new Map<string, number>();
  for (const item of items) {
    const label = weekplannerActivityTypeLabel(item.type);
    typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
  }
  const dominantEntry =
    [...typeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ??
    ["Aktivität", activityCount];
  const dominantType = dominantEntry[0];
  const headline = `${activityCount} ${pluralActivityTypeLabel(dominantType, activityCount)}`;

  const identities = [...new Set(items.map((item) => schedulerDisplayIdentity(item)))].sort((a, b) =>
    a.localeCompare(b, "de-CH"),
  );
  const preview =
    identities.length <= 4
      ? identities.join(" · ")
      : `${identities.slice(0, 4).join(" · ")} · +${identities.length - 4}`;

  const conflictCount = items.filter((item) => item.conflicts.length > 0).length;
  const conflictLabel =
    conflictCount > 0
      ? `${conflictCount} Konflikt${conflictCount === 1 ? "" : "e"}`
      : null;

  const endTimeActionCount = items.filter((item) =>
    weekplannerMatchRequiresEndTimeAction(item),
  ).length;
  const endTimeActionLabel =
    endTimeActionCount > 0
      ? `${endTimeActionCount} Endzeit${endTimeActionCount === 1 ? "" : "en"} fehlt`
      : null;

  return {
    activityCount,
    headline,
    identityPreview: preview,
    conflictCount,
    endTimeActionCount,
    timeLabel: timeLabel ?? null,
    conflictLabel,
    endTimeActionLabel,
  };
}
