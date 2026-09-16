import type { TimedInterval } from "./interval-lanes";
import { intervalsOverlap } from "./interval-lanes";

export type OverlapCluster = {
  id: string;
  intervalIds: string[];
};

function compareIds(a: string, b: string): number {
  return a.localeCompare(b);
}

/** Connected components of temporal overlap (local clusters). */
export function buildOverlapClusters(intervals: readonly TimedInterval[]): OverlapCluster[] {
  if (intervals.length === 0) return [];

  const parent = new Map<string, string>();
  for (const interval of intervals) parent.set(interval.id, interval.id);

  function find(id: string): string {
    let root = id;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    let current = id;
    while (parent.get(current) !== root) {
      const next = parent.get(current)!;
      parent.set(current, root);
      current = next;
    }
    return root;
  }

  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs || compareIds(a.id, b.id));
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (sorted[j].startMs >= sorted[i].endMs) break;
      if (intervalsOverlap(sorted[i], sorted[j])) {
        union(sorted[i].id, sorted[j].id);
      }
    }
  }

  const groups = new Map<string, string[]>();
  for (const interval of intervals) {
    const root = find(interval.id);
    const list = groups.get(root) ?? [];
    list.push(interval.id);
    groups.set(root, list);
  }

  return [...groups.values()]
    .map((ids) => [...ids].sort(compareIds))
    .sort((a, b) => compareIds(a[0], b[0]))
    .map((ids) => ({ id: ids.join("|"), intervalIds: ids }));
}
