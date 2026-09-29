import { prisma } from "@/lib/db/prisma";
import type { SceSelectorItem } from "@/lib/sce/list-selector/types";
import {
  SCE_SELECTOR_DEFAULT_BROWSE_LIMIT,
  SCE_SELECTOR_DEFAULT_SEARCH_LIMIT,
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
} from "@/lib/sce/list-selector/sources/constants";

function toItem(row: { id: string; name: string; key: string }): SceSelectorItem {
  return {
    id: row.id,
    type: "ROLE",
    label: row.name,
    description: row.key,
  };
}

export async function browseRoleSelectorItems(input: {
  tenantId: string;
  limit?: number;
}): Promise<SceSelectorItem[]> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const rows = await prisma.role.findMany({
    where: { tenantId: input.tenantId, scope: "TENANT" },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
    take: limit,
  });
  return rows.map(toItem);
}

export async function searchRoleSelectorItems(input: {
  tenantId: string;
  query: string;
  limit?: number;
}): Promise<SceSelectorItem[]> {
  const term = input.query.trim();
  if (term.length < SCE_SELECTOR_MIN_SEARCH_LENGTH) return [];

  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_SEARCH_LIMIT, 1), 50);
  const rows = await prisma.role.findMany({
    where: {
      tenantId: input.tenantId,
      scope: "TENANT",
      name: { contains: term, mode: "insensitive" },
    },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
    take: limit,
  });
  return rows.map(toItem);
}
