import { prisma } from "@/lib/db/prisma";
import {
  listDirectMessageRecipientsInScope,
  searchDirectMessageRecipients,
} from "@/lib/communication/direct/direct-recipient-search";
import type { SceSelectorItem } from "@/lib/sce/list-selector/types";
import {
  SCE_SELECTOR_DEFAULT_BROWSE_LIMIT,
  SCE_SELECTOR_DEFAULT_SEARCH_LIMIT,
  SCE_SELECTOR_MIN_SEARCH_LENGTH,
} from "@/lib/sce/list-selector/sources/constants";
import {
  browseRequirementAudiencePersons,
  searchRequirementAudiencePersons,
} from "@/lib/requirements/person-search";
import type { SceSelectorAuthorizationContext } from "@/lib/sce/list-selector/selector-authorization-context";
import {
  sceSelectorDecodeOffset,
  sceSelectorPageFromFetched,
  type SceSelectorSourcePage,
} from "@/lib/sce/list-selector/source-pagination";

function toItem(row: {
  id: string;
  label: string;
  description?: string | null;
}): SceSelectorItem {
  return {
    id: row.id,
    type: "PERSON",
    label: row.label,
    description: row.description ?? null,
  };
}

export async function browsePersonSelectorItems(input: {
  tenantId: string;
  actorUserId: string;
  communicationContext?: "DIRECT" | "ORGANISATION" | "TARGET_GROUP_MANAGEMENT";
  authorizationContext?: SceSelectorAuthorizationContext;
  limit?: number;
  cursor?: string | null;
}): Promise<SceSelectorSourcePage> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);
  const offset = sceSelectorDecodeOffset(input.cursor);

  if (
    input.authorizationContext === "REQUIREMENT_AUDIENCE" ||
    input.authorizationContext === "CLUB_REFERENCE" ||
    input.authorizationContext === "WORKSPACE_ACCESS" ||
    input.authorizationContext === "PEOPLE_ACCESS_ADMIN"
  ) {
    const rows = await browseRequirementAudiencePersons(input.tenantId, limit, offset);
    return sceSelectorPageFromFetched(
      rows.map((row) =>
        toItem({
          id: row.personId,
          label: row.displayName,
          description: row.email,
        }),
      ),
      limit,
      offset,
    );
  }

  if (input.communicationContext === "DIRECT") {
    const rows = await listDirectMessageRecipientsInScope({
      tenantId: input.tenantId,
      senderUserId: input.actorUserId,
      limit,
      offset,
    });
    return sceSelectorPageFromFetched(
      rows.map((row) =>
        toItem({
          id: row.personId,
          label: row.displayName,
          description: [...row.teamLabels, ...row.orgUnitLabels].join(" · ") || row.email,
        }),
      ),
      limit,
      offset,
    );
  }

  const rows = await prisma.person.findMany({
    where: { tenantId: input.tenantId, isActive: true },
    select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    skip: offset,
    take: limit + 1,
  });
  return sceSelectorPageFromFetched(
    rows.map((row) =>
      toItem({
        id: row.id,
        label: row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
        description: row.email?.trim() || null,
      }),
    ),
    limit,
    offset,
  );
}

export async function searchPersonSelectorItems(input: {
  tenantId: string;
  actorUserId: string;
  communicationContext?: "DIRECT" | "ORGANISATION" | "TARGET_GROUP_MANAGEMENT";
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

  if (
    input.authorizationContext === "REQUIREMENT_AUDIENCE" ||
    input.authorizationContext === "CLUB_REFERENCE" ||
    input.authorizationContext === "WORKSPACE_ACCESS" ||
    input.authorizationContext === "PEOPLE_ACCESS_ADMIN"
  ) {
    const rows = await searchRequirementAudiencePersons(input.tenantId, term, limit, offset);
    return sceSelectorPageFromFetched(
      rows.map((row) =>
        toItem({
          id: row.personId,
          label: row.displayName,
          description: row.email,
        }),
      ),
      limit,
      offset,
    );
  }

  if (input.communicationContext === "TARGET_GROUP_MANAGEMENT") {
    const rows = await searchRequirementAudiencePersons(input.tenantId, term, limit, offset);
    return sceSelectorPageFromFetched(
      rows.map((row) =>
        toItem({
          id: row.personId,
          label: row.displayName,
          description: row.email,
        }),
      ),
      limit,
      offset,
    );
  }

  const rows = await searchDirectMessageRecipients({
    tenantId: input.tenantId,
    senderUserId: input.actorUserId,
    query: term,
    limit,
    offset,
  });
  return sceSelectorPageFromFetched(
    rows.map((row) =>
      toItem({
        id: row.personId,
        label: row.displayName,
        description: [...row.teamLabels, ...row.orgUnitLabels].join(" · ") || null,
      }),
    ),
    limit,
    offset,
  );
}
