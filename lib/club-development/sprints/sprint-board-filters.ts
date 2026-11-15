import type { SprintBoardCard } from "./sprint-board";

export type SprintBoardFilterState = {
  search: string;
  mineOnly: boolean;
  assigneeUserId: string | null;
  initiativeId: string | null;
  groupByInitiative: boolean;
};

export const EMPTY_BOARD_FILTERS: SprintBoardFilterState = {
  search: "",
  mineOnly: false,
  assigneeUserId: null,
  initiativeId: null,
  groupByInitiative: false,
};

export function filterSprintBoardCards(
  cards: SprintBoardCard[],
  filters: SprintBoardFilterState,
  currentUserId: string | null,
): SprintBoardCard[] {
  let rows = [...cards];
  const q = filters.search.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.initiativeLabel?.toLowerCase().includes(q) ?? false),
    );
  }
  if (filters.mineOnly && currentUserId) {
    rows = rows.filter((c) => c.assignees.some((a) => a.userId === currentUserId));
  }
  if (filters.assigneeUserId) {
    rows = rows.filter((c) =>
      c.assignees.some((a) => a.userId === filters.assigneeUserId),
    );
  }
  if (filters.initiativeId === "none") {
    rows = rows.filter((c) => !c.initiativeId);
  } else if (filters.initiativeId) {
    rows = rows.filter((c) => c.initiativeId === filters.initiativeId);
  }
  return rows;
}

export function groupBoardCardsByInitiative(cards: SprintBoardCard[]): {
  key: string;
  label: string;
  cards: SprintBoardCard[];
}[] {
  const groups = new Map<string, { label: string; cards: SprintBoardCard[] }>();
  for (const card of cards) {
    const key = card.initiativeId ?? "__none__";
    const label = card.initiativeLabel ?? "Ohne Vorhaben";
    const existing = groups.get(key);
    if (existing) existing.cards.push(card);
    else groups.set(key, { label, cards: [card] });
  }
  return [...groups.entries()]
    .map(([key, value]) => ({ key, label: value.label, cards: value.cards }))
    .sort((a, b) => a.label.localeCompare(b.label, "de"));
}

export function isTaskOverdue(dueAtIso: string | null, nowMs = Date.now()): boolean {
  if (!dueAtIso) return false;
  const due = new Date(dueAtIso).getTime();
  if (Number.isNaN(due)) return false;
  return due < nowMs;
}