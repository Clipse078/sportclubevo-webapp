import { cn } from "@/lib/cn";
import type { SportingActivityKind } from "./types";

/**
 * Semantic activity-type pill keys for compact dashboard/agenda rows.
 * Aligns with Infoboard family colors: TRAINING blue, MATCH/SPIEL red, TURNIER orange.
 * Distinct from calendar marker palette (e.g. match-green timeline dots).
 */
export type SportingActivityTypePillVariantKey =
  | "training-blue"
  | "match-red"
  | "tournament-orange";

const PILL_VARIANT_BY_KIND: Partial<
  Record<SportingActivityKind, SportingActivityTypePillVariantKey>
> = {
  TRAINING: "training-blue",
  MATCH: "match-red",
  TOURNAMENT: "tournament-orange",
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
    "inline-block rounded px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em]";

  switch (variant) {
    case "training-blue":
      return cn(
        base,
        "bg-[var(--sce-info-light)]",
        "text-[color-mix(in_srgb,var(--sce-info)_90%,var(--foreground)_10%)]",
      );
    case "match-red":
      return cn(
        base,
        "bg-[var(--sce-secondary-light)]",
        "text-[color-mix(in_srgb,var(--sce-secondary)_88%,var(--foreground)_12%)]",
      );
    case "tournament-orange":
      return cn(
        base,
        "bg-[var(--sce-primary-light)]",
        "text-[color-mix(in_srgb,var(--sce-primary)_92%,var(--foreground)_8%)]",
      );
  }
}
