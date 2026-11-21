import type { DevelopmentSprintStatus } from "@prisma/client";

function compareNullableIso(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

export function comparePlannedSprintsByRank<
  T extends { id: string; status: DevelopmentSprintStatus; startsAt?: string | null },
>(a: T, b: T, rankMap: ReadonlyMap<string, number>): number {
  const ra = rankMap.get(a.id);
  const rb = rankMap.get(b.id);
  if (ra != null && rb != null) return ra - rb;
  if (ra != null) return -1;
  if (rb != null) return 1;
  return compareNullableIso(a.startsAt ?? null, b.startsAt ?? null);
}