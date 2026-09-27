/**
 * Deterministic person-id set helpers for COMM-03 resolution.
 */

export function sortPersonIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort();
}

export function unionSortedSets(sets: readonly (readonly string[])[]): string[] {
  const out = new Set<string>();
  for (const set of sets) {
    for (const id of set) out.add(id);
  }
  return sortPersonIds([...out]);
}

export function intersectSortedSets(sets: readonly (readonly string[])[]): string[] {
  if (sets.length === 0) return [];
  let current = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    const next = new Set(sets[i]);
    current = new Set([...current].filter((id) => next.has(id)));
  }
  return sortPersonIds([...current]);
}

export function differenceSortedSets(
  base: readonly string[],
  subtract: readonly string[],
): string[] {
  const remove = new Set(subtract);
  return sortPersonIds(base.filter((id) => !remove.has(id)));
}
