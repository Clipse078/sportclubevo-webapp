/**
 * Combined personal + operational attention ordering (dashboard conventions).
 *
 * 1. urgency bucket: overdue → due_today → due_soon → action_required
 * 2. dueAt ascending when both present
 * 3. stable id tie-break
 */

import type { PersonalAttentionItem, PersonalAttentionUrgency } from "./types";

const URGENCY_RANK: Record<PersonalAttentionUrgency, number> = {
  overdue: 0,
  due_today: 1,
  due_soon: 2,
  action_required: 3,
};

function dueAtMs(item: PersonalAttentionItem): number | null {
  if (!item.dueAt) return null;
  const ms = new Date(item.dueAt).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function comparePersonalAttentionItems(a: PersonalAttentionItem, b: PersonalAttentionItem): number {
  const rankA = URGENCY_RANK[a.urgency];
  const rankB = URGENCY_RANK[b.urgency];
  if (rankA !== rankB) return rankA - rankB;

  const dueA = dueAtMs(a);
  const dueB = dueAtMs(b);
  if (dueA != null && dueB != null && dueA !== dueB) return dueA - dueB;
  if (dueA != null && dueB == null) return -1;
  if (dueA == null && dueB != null) return 1;

  return a.id.localeCompare(b.id, "de");
}

export function sortPersonalAttentionItems(items: PersonalAttentionItem[]): PersonalAttentionItem[] {
  return [...items].sort(comparePersonalAttentionItems);
}

export function dedupePersonalAttentionItemsById(items: PersonalAttentionItem[]): PersonalAttentionItem[] {
  const byId = new Map<string, PersonalAttentionItem>();
  for (const item of items) {
    if (byId.has(item.id)) {
      throw new Error(`Duplicate personal attention id "${item.id}" in combined attention read model.`);
    }
    byId.set(item.id, item);
  }
  return [...byId.values()];
}
