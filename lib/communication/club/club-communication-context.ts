/**
 * SCE-COMM-11 — Organisation-level conversation anchor + context helpers.
 */

import { prisma } from "@/lib/db/prisma";
import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";

export function createOrganisationCommunicationContext(tenantId: string): CommunicationContextRef {
  return { kind: "ORGANISATION", tenantId: tenantId.trim() };
}

export function createOrgUnitCommunicationContext(orgUnitId: string): CommunicationContextRef {
  return { kind: "ORG_UNIT", orgUnitId: orgUnitId.trim() };
}

export async function getOrCreateOrganisationCommunicationConversation(input: { tenantId: string }) {
  const existing = await prisma.platformCommunicationConversation.findFirst({
    where: {
      tenantId: input.tenantId,
      contextKind: "ORGANISATION",
      conversationKind: "ORG_GENERAL",
      namedThreadSlug: "",
      teamId: null,
    },
  });
  if (existing) return existing;

  return prisma.platformCommunicationConversation.create({
    data: {
      tenantId: input.tenantId,
      contextKind: "ORGANISATION",
      conversationKind: "ORG_GENERAL",
      namedThreadSlug: "",
      teamId: null,
    },
  });
}
