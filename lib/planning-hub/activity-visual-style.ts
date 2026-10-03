/**
 * PLANNING-HUB-02F — centralized semantic activity visuals (Planning Hub only).
 */

import type { WeekplannerItem } from "@/lib/weekplanner/types";

export type PlanningHubSemanticActivityType = WeekplannerItem["type"];

export type ActivityVisualStyle = {
  semanticType: PlanningHubSemanticActivityType | "NEUTRAL" | "MIXED";
  ariaSemanticLabel: string;
  leftAccentClass: string;
  subtleSurfaceClass: string;
  markerClass: string;
  listLeftEdgeClass: string;
  filterDotClass: string;
};

const SEMANTIC_STYLES: Record<PlanningHubSemanticActivityType, ActivityVisualStyle> = {
  TRAINING: {
    semanticType: "TRAINING",
    ariaSemanticLabel: "Training",
    leftAccentClass: "border-l-[color-mix(in_srgb,var(--sce-info)_55%,transparent)]",
    subtleSurfaceClass: "bg-[var(--sce-info-light)]/50",
    markerClass: "bg-[color-mix(in_srgb,var(--sce-info)_65%,transparent)]",
    listLeftEdgeClass: "border-l-[color-mix(in_srgb,var(--sce-info)_40%,transparent)]",
    filterDotClass: "bg-[color-mix(in_srgb,var(--sce-info)_70%,transparent)]",
  },
  MATCH: {
    semanticType: "MATCH",
    ariaSemanticLabel: "Spiel",
    leftAccentClass: "border-l-[color-mix(in_srgb,var(--sce-secondary)_55%,transparent)]",
    subtleSurfaceClass: "bg-[var(--sce-secondary-light)]/50",
    markerClass: "bg-[color-mix(in_srgb,var(--sce-secondary)_65%,transparent)]",
    listLeftEdgeClass: "border-l-[color-mix(in_srgb,var(--sce-secondary)_40%,transparent)]",
    filterDotClass: "bg-[color-mix(in_srgb,var(--sce-secondary)_70%,transparent)]",
  },
  TOURNAMENT: {
    semanticType: "TOURNAMENT",
    ariaSemanticLabel: "Turnier",
    leftAccentClass: "border-l-[color-mix(in_srgb,var(--sce-primary)_55%,transparent)]",
    subtleSurfaceClass: "bg-[var(--sce-primary-light)]/50",
    markerClass: "bg-[color-mix(in_srgb,var(--sce-primary)_65%,transparent)]",
    listLeftEdgeClass: "border-l-[color-mix(in_srgb,var(--sce-primary)_40%,transparent)]",
    filterDotClass: "bg-[color-mix(in_srgb,var(--sce-primary)_70%,transparent)]",
  },
  VERANSTALTUNG: {
    semanticType: "VERANSTALTUNG",
    ariaSemanticLabel: "Veranstaltung",
    leftAccentClass: "border-l-amber-400/50",
    subtleSurfaceClass: "bg-amber-500/[0.06]",
    markerClass: "bg-amber-400/60",
    listLeftEdgeClass: "border-l-amber-400/35",
    filterDotClass: "bg-amber-400/65",
  },
};

const NEUTRAL_STYLE: ActivityVisualStyle = {
  semanticType: "NEUTRAL",
  ariaSemanticLabel: "Aktivität",
  leftAccentClass: "border-l-[var(--border)]",
  subtleSurfaceClass: "bg-[var(--surface)]",
  markerClass: "bg-[var(--muted)]/50",
  listLeftEdgeClass: "border-l-[var(--border)]",
  filterDotClass: "bg-[var(--muted)]/60",
};

const MIXED_STYLE: ActivityVisualStyle = {
  semanticType: "MIXED",
  ariaSemanticLabel: "Mehrere Aktivitätstypen",
  leftAccentClass: "border-l-[var(--border)]",
  subtleSurfaceClass: "bg-[var(--surface)]",
  markerClass: "bg-[var(--muted)]/45",
  listLeftEdgeClass: "border-l-[var(--border)]",
  filterDotClass: "bg-[var(--muted)]/60",
};

/** Conflict affordances — orthogonal to semantic activity colour. */
export const PLANNING_HUB_CONFLICT_BLOCK_CLASS =
  "ring-1 ring-inset ring-amber-500/25";

export function activityVisualStyle(
  type: PlanningHubSemanticActivityType | "NEUTRAL" | "MIXED" | string | undefined,
): ActivityVisualStyle {
  if (type === "TRAINING" || type === "MATCH" || type === "TOURNAMENT" || type === "VERANSTALTUNG") {
    return SEMANTIC_STYLES[type];
  }
  if (type === "MIXED") return MIXED_STYLE;
  return NEUTRAL_STYLE;
}

export function aggregateClusterSemanticType(
  items: readonly WeekplannerItem[],
): PlanningHubSemanticActivityType | "MIXED" {
  if (items.length === 0) return "MIXED";
  const first = items[0]!.type;
  for (let i = 1; i < items.length; i += 1) {
    if (items[i]!.type !== first) return "MIXED";
  }
  return first;
}

export function activityFilterToSemanticType(
  filter: "trainings" | "spiele" | "turniere" | "veranstaltungen",
): PlanningHubSemanticActivityType {
  switch (filter) {
    case "trainings":
      return "TRAINING";
    case "spiele":
      return "MATCH";
    case "turniere":
      return "TOURNAMENT";
    case "veranstaltungen":
      return "VERANSTALTUNG";
  }
}
