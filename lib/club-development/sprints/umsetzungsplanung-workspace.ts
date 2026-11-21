import type { DevelopmentSprintStatus } from "@prisma/client";
import { comparePlannedSprintsByRank } from "./planned-sprint-rank-ordering";

export type UmsetzungsplanungSprintBuckets<T extends { status: DevelopmentSprintStatus; endsAt?: string | null }> = {
  active: T[];
  planned: T[];
  completed: T[];
};

/** Presentation ordering for the consolidated Umsetzungsplanung workspace. */
export function partitionSprintsForUmsetzungsplanung<
  T extends {
    id: string;
    status: DevelopmentSprintStatus;
    endsAt?: string | null;
    startsAt?: string | null;
  },
>(sprints: T[], plannedRankMap: ReadonlyMap<string, number> = new Map()): UmsetzungsplanungSprintBuckets<T> {
  const active = sprints.filter((s) => s.status === "ACTIVE");
  const planned = sprints
    .filter((s) => s.status === "PLANNED")
    .sort((a, b) => comparePlannedSprintsByRank(a, b, new Map(plannedRankMap)));
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

export function groupScheduleDestinationPhases(
  options: readonly UmsetzungsplanungPhaseOption[],
  excludePhaseId?: string | null,
) {
  const filtered = excludePhaseId ? options.filter((p) => p.id !== excludePhaseId) : [...options];
  return {
    ongoing: filtered.filter((p) => p.status === "ACTIVE"),
    planned: filtered.filter((p) => p.status === "PLANNED"),
  };
}

export function hasScheduleDestinationPhases(
  options: readonly UmsetzungsplanungPhaseOption[],
  excludePhaseId?: string | null,
): boolean {
  const grouped = groupScheduleDestinationPhases(options, excludePhaseId);
  return grouped.ongoing.length + grouped.planned.length > 0;
}

export type UmsetzungsplanungSectionKey = "ongoing" | "planned" | "unplanned" | "completed";

export type UmsetzungsplanungBucketCounts = {
  ongoing: number;
  planned: number;
  completed: number;
};

/** Authorised-scope counts derived from server-provided sprint rows (empty means genuinely none). */
export function countUmsetzungsplanungBuckets<T extends { status: DevelopmentSprintStatus }>(
  buckets: UmsetzungsplanungSprintBuckets<T>,
): UmsetzungsplanungBucketCounts {
  return {
    ongoing: buckets.active.length,
    planned: buckets.planned.length,
    completed: buckets.completed.length,
  };
}

export function hasOpenUmsetzungsplanungPhases(counts: UmsetzungsplanungBucketCounts): boolean {
  return counts.ongoing > 0 || counts.planned > 0;
}

/** Initial expand state when the user has not chosen section toggles yet (no deep link). */
export function resolveUmsetzungsplanungSectionOpenDefaults(
  counts: UmsetzungsplanungBucketCounts,
  canManageSprints: boolean,
): Record<UmsetzungsplanungSectionKey, boolean> {
  const hasOpen = hasOpenUmsetzungsplanungPhases(counts);
  return {
    ongoing: counts.ongoing > 0,
    planned: counts.planned > 0,
    unplanned: canManageSprints && !hasOpen,
    completed: false,
  };
}

const SECTION_FOCUS_ALIASES: Record<string, UmsetzungsplanungSectionKey> = {
  laufend: "ongoing",
  ongoing: "ongoing",
  geplant: "planned",
  planned: "planned",
  ungeplant: "unplanned",
  unplanned: "unplanned",
  abgeschlossen: "completed",
  completed: "completed",
};

export function parseUmsetzungsplanungSectionFocus(
  raw: string | null | undefined,
): UmsetzungsplanungSectionKey | null {
  if (!raw?.trim()) return null;
  return SECTION_FOCUS_ALIASES[raw.trim().toLowerCase()] ?? null;
}

export function applyUmsetzungsplanungSectionDeepLink(
  defaults: Record<UmsetzungsplanungSectionKey, boolean>,
  focus: UmsetzungsplanungSectionKey | null,
): Record<UmsetzungsplanungSectionKey, boolean> {
  if (!focus) return defaults;
  return {
    ...defaults,
    [focus]: true,
  };
}