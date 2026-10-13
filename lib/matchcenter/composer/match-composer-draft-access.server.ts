import { prisma } from "@/lib/db/prisma";
import { getMatchComposerDraft } from "./match-draft-persistence";

export async function getMatchComposerDraftForCreatorResume(input: {
  tenantId: string;
  draftId: string;
  actorPersonId: string;
}) {
  const row = await prisma.matchComposerDraft.findFirst({
    where: {
      id: input.draftId,
      tenantId: input.tenantId,
      createdByPersonId: input.actorPersonId,
      lifecycleState: { in: ["DRAFT", "CHANGES_REQUESTED", "PENDING_APPROVAL", "REJECTED"] },
    },
  });
  if (!row) return null;

  const draft = await getMatchComposerDraft(input.tenantId, input.draftId);
  if (!draft) return null;

  return {
    draftId: draft.id,
    payload: draft.payload,
    lifecycleState: draft.lifecycleState,
  };
}
