import type { DevelopmentSprintStatus } from "@prisma/client";
import type { UmsetzungsplanungSectionKey, UmsetzungsplanungSprintBuckets } from "./sprints/umsetzungsplanung-workspace";

export const UMSETZUNGSPLANUNG_SCHEDULE_DROP_DWELL_MS = 450;

export type UmsetzungsplanungScheduleDropSectionEligibility = {
  acceptsDrop: boolean;
  hasEligiblePhases: boolean;
};

/** Sections that may accept unplanned task scheduling drops (excludes completed). */
export function resolveScheduleDropSectionEligibility(
  sectionKey: Exclude<UmsetzungsplanungSectionKey, "unplanned" | "completed">,
  buckets: UmsetzungsplanungSprintBuckets<{ status: DevelopmentSprintStatus }>,
): UmsetzungsplanungScheduleDropSectionEligibility {
  const phases = sectionKey === "ongoing" ? buckets.active : buckets.planned;
  const eligible = phases.filter((p) => isPhaseScheduleDropEligible(p.status));
  return {
    acceptsDrop: eligible.length > 0,
    hasEligiblePhases: eligible.length > 0,
  };
}

export function isPhaseScheduleDropEligible(status: DevelopmentSprintStatus): boolean {
  return status === "ACTIVE" || status === "PLANNED";
}