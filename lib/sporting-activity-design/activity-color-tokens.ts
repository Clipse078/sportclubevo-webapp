import {
  resolveSportingActivityTypePillVariant,
  sportingActivityTypePillClassName,
  type SportingActivityTypePillVariantKey,
} from "@/lib/sporting-activity-presentation/activity-type-pill";
import type { SportingActivityKind } from "@/lib/sporting-activity-presentation/types";

export type { SportingActivityTypePillVariantKey };

/** Canonical semantic activity colors — single mapping for new Activity Design consumers. */
export const SPORTING_ACTIVITY_COLOR_BY_KIND: Partial<
  Record<SportingActivityKind, SportingActivityTypePillVariantKey>
> = {
  TRAINING: "training-blue",
  MATCH: "match-red",
  TOURNAMENT: "tournament-orange",
};

export function resolveSportingActivityColorToken(
  activityKind: SportingActivityKind | undefined,
): SportingActivityTypePillVariantKey | undefined {
  return resolveSportingActivityTypePillVariant(activityKind);
}

export function sportingActivityColorClassName(
  activityKind: SportingActivityKind | undefined,
): string | undefined {
  const variant = resolveSportingActivityColorToken(activityKind);
  return variant ? sportingActivityTypePillClassName(variant) : undefined;
}
