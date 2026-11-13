/**
 * Canonical Traktanden display order: position in server sort (orderIndex asc, createdAt asc).
 * One displayed number per item across workspace, overview and protocol export.
 */

export type AgendaOrderable = {
  id: string;
  orderIndex: number;
};

export function buildCanonicalAgendaDisplayOrderMap<T extends AgendaOrderable>(
  sortedItems: T[],
): Map<string, number> {
  const map = new Map<string, number>();
  sortedItems.forEach((item, index) => {
    map.set(item.id, index + 1);
  });
  return map;
}

export function resolveCanonicalAgendaDisplayNumber(
  sortedItems: AgendaOrderable[],
  itemId: string,
): number {
  const map = buildCanonicalAgendaDisplayOrderMap(sortedItems);
  return map.get(itemId) ?? 0;
}

export function formatAgendaHeading(displayNumber: number, title: string): string {
  if (displayNumber <= 0) return title;
  return `${displayNumber}. ${title}`;
}
