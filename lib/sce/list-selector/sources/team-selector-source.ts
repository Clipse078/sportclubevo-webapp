import { prisma } from "@/lib/db/prisma";
import type { SceSelectorItem } from "@/lib/sce/list-selector/types";
import {
  SCE_SELECTOR_DEFAULT_BROWSE_LIMIT,
  SCE_SELECTOR_DEFAULT_SEARCH_LIMIT,
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
} from "@/lib/sce/list-selector/sources/constants";

function toItem(row: {
  id: string;
  name: string;
  shortName: string | null;
}): SceSelectorItem {
  return {
    id: row.id,
    type: "TEAM",
    label: row.name,
    description: row.shortName?.trim() || null,
  };
}

export async function browseTeamSelectorItems(input: {
  tenantId: string;
  limit?: number;
}): Promise<SceSelectorItem[]> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const rows = await prisma.team.findMany({
    where: { tenantId: input.tenantId },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
    take: limit,
  });
  return rows.map(toItem);
}

export async function searchTeamSelectorItems(input: {
  tenantId: string;
  query: string;
  limit?: number;
}): Promise<SceSelectorItem[]> {
  const term = input.query.trim();
  if (term.length < SCE_SELECTOR_MIN_SEARCH_LENGTH) return [];

  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_SEARCH_LIMIT, 1), 50);
  const rows = await prisma.team.findMany({
    where: {
      tenantId: input.tenantId,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { shortName: { contains: term, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
    take: limit,
  });
  return rows.map(toItem);
}
