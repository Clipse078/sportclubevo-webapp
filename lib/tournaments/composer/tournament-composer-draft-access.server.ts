import { prisma } from "@/lib/db/prisma";
import { getTournamentComposerDraft } from "./tournament-draft-persistence";

export async function getTournamentComposerDraftForCreatorResume(input: {
  tenantId: string;
  draftId: string;
  actorPersonId: string;
}) {
  const row = await prisma.tournamentComposerDraft.findFirst({
    where: {
      id: input.draftId,
      tenantId: input.tenantId,
      createdByPersonId: input.actorPersonId,
      lifecycleState: { in: ["DRAFT", "CHANGES_REQUESTED", "PENDING_APPROVAL", "REJECTED"] },
    },
  });
  if (!row) return null;

  const draft = await getTournamentComposerDraft(input.tenantId, input.draftId);
  if (!draft) return null;

  return {
    draftId: draft.id,
    payload: draft.payload,
    lifecycleState: draft.lifecycleState,
  };
}
