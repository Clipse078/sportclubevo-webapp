import { cn } from "@/lib/cn";
import type { SportingActivityKind } from "./types";

/**
 * Semantic activity-type pill keys for compact dashboard/agenda rows.
 * Aligns with Infoboard family colors: TRAINING blue, MATCH/SPIEL red, TURNIER orange.
 * Calendar month markers reuse the same semantic palette via programme-source-presentation.
 */
export type SportingActivityTypePillVariantKey =
  | "training-blue"
  | "match-red"
  | "tournament-orange"
  | "club-event-violet";

const PILL_VARIANT_BY_KIND: Partial<
  Record<SportingActivityKind, SportingActivityTypePillVariantKey>
> = {
  TRAINING: "training-blue",
  MATCH: "match-red",
  TOURNAMENT: "tournament-orange",
  EVENT: "club-event-violet",
};

export function resolveSportingActivityTypePillVariant(
  activityKind: SportingActivityKind | undefined,
): SportingActivityTypePillVariantKey | undefined {
  if (!activityKind) {
    return undefined;
  }
  return PILL_VARIANT_BY_KIND[activityKind];
}

/** Tailwind classes for a compact secondary type pill (not a primary action). */
export function sportingActivityTypePillClassName(
  variant: SportingActivityTypePillVariantKey,
): string {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em]";

  switch (variant) {
    case "training-blue":
      return cn(
        base,
        "border-[var(--sce-activity-pill-training-border)]",
        "bg-[var(--sce-activity-pill-training-bg)]",
        "text-[var(--sce-activity-pill-training-text)]",
      );
    case "match-red":
      return cn(
        base,
        "border-[var(--sce-activity-pill-match-border)]",
        "bg-[var(--sce-activity-pill-match-bg)]",
        "text-[var(--sce-activity-pill-match-text)]",
      );
    case "tournament-orange":
      return cn(
        base,
        "border-[var(--sce-activity-pill-tournament-border)]",
        "bg-[var(--sce-activity-pill-tournament-bg)]",
        "text-[var(--sce-activity-pill-tournament-text)]",
      );
    case "club-event-violet":
      return cn(
        base,
        "border-[var(--sce-activity-pill-club-event-border)]",
        "bg-[var(--sce-activity-pill-club-event-bg)]",
        "text-[var(--sce-activity-pill-club-event-text)]",
      );
  }
}
