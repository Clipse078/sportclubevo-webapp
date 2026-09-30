/**
 * SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — deterministic ordering for operational attention items.
 *
 * 1. dueAt ascending (deadline passed / nearest first; null dueAt last among dated)
 * 2. stable id tie-break
 */

import type { DomainOperationalAttentionItem } from "./types";

function dueAtMs(item: DomainOperationalAttentionItem): number | null {
  if (!item.dueAt) return null;
  const ms = new Date(item.dueAt).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function compareDomainOperationalAttentionItems(
  a: DomainOperationalAttentionItem,
  b: DomainOperationalAttentionItem,
): number {
  const dueA = dueAtMs(a);
  const dueB = dueAtMs(b);
  if (dueA != null && dueB != null && dueA !== dueB) return dueA - dueB;
  if (dueA != null && dueB == null) return -1;
  if (dueA == null && dueB != null) return 1;
  return a.id.localeCompare(b.id, "de");
}

export function sortDomainOperationalAttentionItems(
  items: DomainOperationalAttentionItem[],
): DomainOperationalAttentionItem[] {
  return [...items].sort(compareDomainOperationalAttentionItems);
}
