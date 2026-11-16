import type { DevelopmentSprintStatus } from "@prisma/client";

export type UmsetzungsplanungSprintBuckets<T extends { status: DevelopmentSprintStatus; endsAt?: string | null }> = {
  active: T[];
  planned: T[];
  completed: T[];
};

/** Presentation ordering for the consolidated Umsetzungsplanung workspace. */
export function partitionSprintsForUmsetzungsplanung<
  T extends { status: DevelopmentSprintStatus; endsAt?: string | null; startsAt?: string | null },
>(sprints: T[]): UmsetzungsplanungSprintBuckets<T> {
  const active = sprints.filter((s) => s.status === "ACTIVE");
  const planned = sprints
    .filter((s) => s.status === "PLANNED")
    .sort((a, b) => compareNullableIso(a.startsAt ?? null, b.startsAt ?? null));
  const completed = sprints
    .filter((s) => s.status === "COMPLETED")
    .sort((a, b) => compareNullableIso(b.endsAt ?? null, a.endsAt ?? null));
  return { active, planned, completed };
}

function compareNullableIso(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

export type UmsetzungsplanungPhaseOption = {
  id: string;
  slug: string;
  title: string;
  status: DevelopmentSprintStatus;
};

export function openPhaseAssignmentOptions(
  buckets: UmsetzungsplanungSprintBuckets<UmsetzungsplanungPhaseOption>,
): UmsetzungsplanungPhaseOption[] {
  return [...buckets.active, ...buckets.planned];
}