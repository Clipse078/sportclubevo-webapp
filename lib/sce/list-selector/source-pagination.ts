import type { SceSelectorItem } from "@/lib/sce/list-selector/types";

export type SceSelectorSourcePage = {
  items: SceSelectorItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

export function sceSelectorDecodeOffset(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function sceSelectorPageFromFetched(
  items: SceSelectorItem[],
  limit: number,
  offset: number,
): SceSelectorSourcePage {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  return {
    items: pageItems,
    hasMore,
    nextCursor: hasMore ? String(offset + limit) : null,
  };
}

export function mergeSceSelectorResultGroups(
  existing: readonly { type: SceSelectorItem["type"]; heading: string; items: SceSelectorItem[]; hasMore?: boolean; nextCursor?: string | null }[],
  incoming: readonly { type: SceSelectorItem["type"]; heading: string; items: SceSelectorItem[]; hasMore?: boolean; nextCursor?: string | null }[],
): Array<{
  type: SceSelectorItem["type"];
  heading: string;
  items: SceSelectorItem[];
  hasMore?: boolean;
  nextCursor?: string | null;
}> {
  const order: SceSelectorItem["type"][] = [];
  const map = new Map<
    SceSelectorItem["type"],
    {
      type: SceSelectorItem["type"];
      heading: string;
      items: SceSelectorItem[];
      hasMore?: boolean;
      nextCursor?: string | null;
    }
  >();

  for (const group of existing) {
    order.push(group.type);
    map.set(group.type, {
      type: group.type,
      heading: group.heading,
      items: [...group.items],
      hasMore: group.hasMore,
      nextCursor: group.nextCursor,
    });
  }

  for (const group of incoming) {
    if (!map.has(group.type)) {
      order.push(group.type);
      map.set(group.type, {
        type: group.type,
        heading: group.heading,
        items: [...group.items],
        hasMore: group.hasMore,
        nextCursor: group.nextCursor,
      });
      continue;
    }
    const prev = map.get(group.type)!;
    const seen = new Set(prev.items.map((item) => item.id));
    for (const item of group.items) {
      if (seen.has(item.id)) continue;
      prev.items.push(item);
      seen.add(item.id);
    }
    prev.hasMore = group.hasMore;
    prev.nextCursor = group.nextCursor;
  }

  return order.map((type) => map.get(type)!);
}
