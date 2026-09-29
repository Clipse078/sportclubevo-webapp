import { prisma } from "@/lib/db/prisma";
import type { SceSelectorItem } from "@/lib/sce/list-selector/types";
import {
  SCE_SELECTOR_DEFAULT_BROWSE_LIMIT,
  SCE_SELECTOR_DEFAULT_SEARCH_LIMIT,
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
} from "@/lib/sce/list-selector/sources/constants";
import {
  sceSelectorDecodeOffset,
  sceSelectorPageFromFetched,
  type SceSelectorSourcePage,
} from "@/lib/sce/list-selector/source-pagination";

function toItem(row: { id: string; name: string; key: string }): SceSelectorItem {
  return {
    id: row.id,
    type: "ORG_UNIT",
    label: row.name,
    description: "Organisationseinheit",
    searchText: row.key,
  };
}

export async function browseOrgUnitSelectorItems(input: {
  tenantId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const rows = await prisma.orgUnit.findMany({
    where: { tenantId: input.tenantId },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
    skip: offset,
    take: limit + 1,
  });
  return sceSelectorPageFromFetched(rows.map(toItem), limit, offset);
}

export async function searchOrgUnitSelectorItems(input: {
  tenantId: string;
  query: string;
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const term = input.query.trim();
  if (term.length < SCE_SELECTOR_MIN_SEARCH_LENGTH) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_SEARCH_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const rows = await prisma.orgUnit.findMany({
    where: {
      tenantId: input.tenantId,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { key: { contains: term, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
    skip: offset,
    take: limit + 1,
  });
  return sceSelectorPageFromFetched(rows.map(toItem), limit, offset);
}
