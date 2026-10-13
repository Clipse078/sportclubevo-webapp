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

function formatOrgUnitLabel(option: { label: string; level: number }): string {
  const indent = option.level > 0 ? `${" ".repeat(option.level * 2)}↳ ` : "";
  return `${indent}${option.label}`;
}

function toItem(option: { id: string; label: string; level: number }): SceSelectorItem {
  return {
    id: option.id,
    type: "ORG_UNIT",
    label: formatOrgUnitLabel(option),
    description: "Organisationseinheit",
    metadata: { level: option.level },
  };
}

async function loadActiveOrgUnits(tenantId: string) {
  return prisma.orgUnit.findMany({
    where: { tenantId, status: { not: "ARCHIVED" }, archivedAt: null },
    select: { id: true, name: true, level: true, sortOrder: true },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function browseClubEventOrgAudienceOrgUnitItems(input: {
  tenantId: string;
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const options = await loadActiveOrgUnits(input.tenantId);
  const slice = options.slice(offset, offset + limit + 1);
  return sceSelectorPageFromFetched(
    slice.map((row) => toItem({ id: row.id, label: row.name, level: row.level })),
    limit,
    offset,
  );
}

export async function searchClubEventOrgAudienceOrgUnitItems(input: {
  tenantId: string;
  query: string;
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const term = input.query.trim().toLowerCase();
  if (term.length < SCE_SELECTOR_MIN_SEARCH_LENGTH) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_SEARCH_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const options = await loadActiveOrgUnits(input.tenantId);
  const filtered = options.filter((row) =>
    formatOrgUnitLabel({ label: row.name, level: row.level }).toLowerCase().includes(term),
  );
  const slice = filtered.slice(offset, offset + limit + 1);
  return sceSelectorPageFromFetched(
    slice.map((row) => toItem({ id: row.id, label: row.name, level: row.level })),
    limit,
    offset,
  );
}
