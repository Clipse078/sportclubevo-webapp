export type SelectableTaskRef = { id: string; selectable: boolean };

export type InitiativeGroupSelectionState = "none" | "partial" | "all";

export function selectableIdsInGroup(tasks: readonly SelectableTaskRef[]): string[] {
  return tasks.filter((t) => t.selectable).map((t) => t.id);
}

export function initiativeGroupSelectionState(
  tasks: readonly SelectableTaskRef[],
  selectedIds: ReadonlySet<string>,
): InitiativeGroupSelectionState {
  const selectable = selectableIdsInGroup(tasks);
  if (selectable.length === 0) return "none";
  const selectedCount = selectable.filter((id) => selectedIds.has(id)).length;
  if (selectedCount === 0) return "none";
  if (selectedCount === selectable.length) return "all";
  return "partial";
}

export function toggleInitiativeGroupSelection(
  tasks: readonly SelectableTaskRef[],
  selectedIds: ReadonlySet<string>,
): Set<string> {
  const selectable = selectableIdsInGroup(tasks);
  const state = initiativeGroupSelectionState(tasks, selectedIds);
  const next = new Set(selectedIds);
  if (state === "all") {
    for (const id of selectable) next.delete(id);
  } else {
    for (const id of selectable) next.add(id);
  }
  return next;
}

export function filterCatalogBySearch<T extends { title: string }>(
  query: string,
  rows: readonly T[],
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((r) => r.title.toLowerCase().includes(q));
}

export function matchesInitiativeSearch(title: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return title.toLowerCase().includes(q);
}