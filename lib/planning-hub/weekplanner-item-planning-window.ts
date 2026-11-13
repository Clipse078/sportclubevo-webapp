import { coercePlanningInstant } from "@/lib/planning-hub/manipulation-transport";
import type { WeekplannerItem } from "@/lib/weekplanner/types";

/** Canonical planning interval for availability queries and editors — tolerates RSC ISO strings. */
export function weekplannerItemPlanningWindow(item: WeekplannerItem): { startAt: string; endAt: string } {
  const start = coercePlanningInstant(item.canonicalStartAt, "canonicalStartAt");
  const end = coercePlanningInstant(item.canonicalEndAt, "canonicalEndAt");
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}
