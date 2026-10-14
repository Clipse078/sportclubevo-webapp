import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TournamentComposerDraftPayload } from "./tournament-composer-draft-types";

export type TournamentDraftRecord = {
  id: string;
  lifecycleState: string;
  payload: TournamentComposerDraftPayload;
  revisionNumber: number;
};

function parsePayload(raw: unknown): TournamentComposerDraftPayload {
  return raw as TournamentComposerDraftPayload;
}

export async function saveTournamentComposerDraft(input: {
  tenantId: string;
  actorPersonId: string;
  draftId?: string | null;
  payload: TournamentComposerDraftPayload;
}): Promise<{ draftId: string }> {
  const resourceJson = input.payload.resourceAllocations as unknown as Prisma.InputJsonValue;

  if (input.draftId) {
    const existing = await prisma.tournamentComposerDraft.findFirst({
      where: {
        id: input.draftId,
        tenantId: input.tenantId,
        createdByPersonId: input.actorPersonId,
        lifecycleState: { in: ["DRAFT", "CHANGES_REQUESTED"] },
      },
    });
    if (!existing) {
      throw new Error("Entwurf nicht gefunden oder nicht mehr bearbeitbar.");
    }
    await prisma.tournamentComposerDraft.update({
      where: { id: existing.id },
      data: {
        payload: input.payload as unknown as Prisma.InputJsonValue,
        draftResourceSelections: resourceJson,
        updatedByPersonId: input.actorPersonId,
        lifecycleState: "DRAFT",
      },
    });
    return { draftId: existing.id };
  }

  const created = await prisma.tournamentComposerDraft.create({
    data: {
      tenantId: input.tenantId,
      createdByPersonId: input.actorPersonId,
      updatedByPersonId: input.actorPersonId,
      lifecycleState: "DRAFT",
      payload: input.payload as unknown as Prisma.InputJsonValue,
      draftResourceSelections: resourceJson,
    },
  });
  return { draftId: created.id };
}

export async function getTournamentComposerDraft(
  tenantId: string,
  draftId: string,
): Promise<TournamentDraftRecord | null> {
  const row = await prisma.tournamentComposerDraft.findFirst({
    where: { id: draftId, tenantId },
  });
  if (!row) return null;
  return {
    id: row.id,
    lifecycleState: row.lifecycleState,
    payload: parsePayload(row.payload),
    revisionNumber: row.revisionNumber,
  };
}

export async function listTournamentComposerDraftsForManagement(tenantId: string) {
  return prisma.tournamentComposerDraft.findMany({
    where: {
      tenantId,
      lifecycleState: {
        in: ["DRAFT", "PENDING_APPROVAL", "CHANGES_REQUESTED", "REJECTED"],
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}
