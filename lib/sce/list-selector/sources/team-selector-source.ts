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
import type { SceSelectorAuthorizationContext } from "@/lib/sce/list-selector/selector-authorization-context";
import { enrichRequirementAudienceStructuralItems } from "@/lib/sce/list-selector/sources/requirement-audience-expansion-labels";

async function maybeEnrichRequirementAudiencePage(
  tenantId: string,
  authorizationContext: SceSelectorAuthorizationContext | undefined,
  page: SceSelectorSourcePage,
): Promise<SceSelectorSourcePage> {
  if (authorizationContext !== "REQUIREMENT_AUDIENCE") return page;
  return { ...page, items: await enrichRequirementAudienceStructuralItems(tenantId, page.items) };
}

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
  authorizationContext?: SceSelectorAuthorizationContext;
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);
  const rows = await prisma.team.findMany({
    where: { tenantId: input.tenantId },
    select: { id: true, name: true, shortName: true },
    orderBy: { name: "asc" },
    skip: offset,
    take: limit + 1,
  });
  const page = sceSelectorPageFromFetched(rows.map(toItem), limit, offset);
  return maybeEnrichRequirementAudiencePage(input.tenantId, input.authorizationContext, page);
}

export async function searchTeamSelectorItems(input: {
  tenantId: string;
  authorizationContext?: SceSelectorAuthorizationContext;
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
    skip: offset,
    take: limit + 1,
  });
  const page = sceSelectorPageFromFetched(rows.map(toItem), limit, offset);
  return maybeEnrichRequirementAudiencePage(input.tenantId, input.authorizationContext, page);
}
