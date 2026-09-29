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
  communicationContext?: "DIRECT" | "ORGANISATION";
  limit?: number;
}): Promise<SceSelectorItem[]> {
  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_BROWSE_LIMIT, 1), 50);

  if (input.communicationContext === "DIRECT") {
    const rows = await listDirectMessageRecipientsInScope({
      tenantId: input.tenantId,
      senderUserId: input.actorUserId,
      limit,
    });
    return rows.map((row) =>
      toItem({
        id: row.personId,
        label: row.displayName,
        description: [...row.teamLabels, ...row.orgUnitLabels].join(" · ") || row.email,
      }),
    );
  }

  const rows = await prisma.person.findMany({
    where: { tenantId: input.tenantId, isActive: true },
    select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: limit,
  });
  return rows.map((row) =>
    toItem({
      id: row.id,
      label: row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
      description: row.email?.trim() || null,
    }),
  );
}

export async function searchPersonSelectorItems(input: {
  tenantId: string;
  actorUserId: string;
  communicationContext?: "DIRECT" | "ORGANISATION";
  query: string;
  limit?: number;
}): Promise<SceSelectorItem[]> {
  const term = input.query.trim();
  if (term.length < SCE_SELECTOR_MIN_SEARCH_LENGTH) return [];

  const limit = Math.min(Math.max(input.limit ?? SCE_SELECTOR_DEFAULT_SEARCH_LIMIT, 1), 50);
  const rows = await searchDirectMessageRecipients({
    tenantId: input.tenantId,
    senderUserId: input.actorUserId,
    query: term,
  });
  return rows.slice(0, limit).map((row) =>
    toItem({
      id: row.personId,
      label: row.displayName,
      description: [...row.teamLabels, ...row.orgUnitLabels].join(" · ") || null,
    }),
  );
}
