import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  getClubEventComposerDraft,
  type ClubEventDraftRecord,
} from "./club-event-draft-persistence";

const EDITABLE_LIFECYCLE = ["DRAFT", "CHANGES_REQUESTED"] as const;

/**
 * Loads a composer draft for resume when the actor is the creator.
 * Returns null for missing, cross-tenant, or unauthorized access (404 semantics).
 */
export async function getClubEventComposerDraftForCreatorResume(input: {
  tenantId: string;
  draftId: string;
  creatorPersonId: string;
}): Promise<ClubEventDraftRecord | null> {
  const row = await prisma.clubEventComposerDraft.findFirst({
    where: {
      id: input.draftId,
      tenantId: input.tenantId,
      createdByPersonId: input.creatorPersonId,
      lifecycleState: { in: [...EDITABLE_LIFECYCLE] },
    },
  });
  if (!row) {
    return null;
  }
  return getClubEventComposerDraft(input.tenantId, row.id);
}
