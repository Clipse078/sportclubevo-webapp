import type { WeekplannerItem } from "@/lib/weekplanner/types";
import { schedulerDisplayIdentity } from "@/lib/planning-hub/scheduler-display-label";
import { weekplannerActivityTypeLabel } from "@/lib/planning-hub/item-presenters";
import { weekplannerMatchRequiresEndTimeAction } from "@/lib/planning-hub/match-operational-presenters";

export type AggregateClusterSummary = {
  activityCount: number;
  headline: string;
  /** True when the cluster contains more than one weekplanner activity type. */
  isMixedActivityTypes: boolean;
  identityPreview: string;
  conflictCount: number;
  endTimeActionCount: number;
  timeLabel: string | null;
  conflictLabel: string | null;
  endTimeActionLabel: string | null;
};

export function aggregateClusterHasMixedActivityTypes(items: readonly WeekplannerItem[]): boolean {
  if (items.length === 0) return false;
  const first = items[0]!.type;
  for (let i = 1; i < items.length; i += 1) {
    if (items[i]!.type !== first) return true;
  }
  return false;
}

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
  const isMixedActivityTypes = aggregateClusterHasMixedActivityTypes(items);
  const headline = isMixedActivityTypes
    ? `${activityCount} Aktivitäten`
    : `${activityCount} ${pluralActivityTypeLabel(
        weekplannerActivityTypeLabel(items[0]?.type ?? "TRAINING"),
        activityCount,
      )}`;

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
    isMixedActivityTypes,
    identityPreview: preview,
    conflictCount,
    endTimeActionCount,
    timeLabel: timeLabel ?? null,
    conflictLabel,
    endTimeActionLabel,
  };
}
