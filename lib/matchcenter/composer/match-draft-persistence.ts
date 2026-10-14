import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { MatchComposerDraftPayload } from "./match-composer-draft-types";

export type MatchDraftRecord = {
  id: string;
  lifecycleState: string;
  payload: MatchComposerDraftPayload;
  revisionNumber: number;
};

function parsePayload(raw: unknown): MatchComposerDraftPayload {
  return raw as MatchComposerDraftPayload;
}

export async function saveMatchComposerDraft(input: {
  tenantId: string;
  actorPersonId: string;
  draftId?: string | null;
  payload: MatchComposerDraftPayload;
}): Promise<{ draftId: string }> {
  const resourceJson = input.payload.resources as unknown as Prisma.InputJsonValue;

  if (input.draftId) {
    const existing = await prisma.matchComposerDraft.findFirst({
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
    await prisma.matchComposerDraft.update({
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

  const created = await prisma.matchComposerDraft.create({
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

export async function getMatchComposerDraft(
  tenantId: string,
  draftId: string,
): Promise<MatchDraftRecord | null> {
  const row = await prisma.matchComposerDraft.findFirst({
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

export async function listMatchComposerDraftsForManagement(tenantId: string) {
  return prisma.matchComposerDraft.findMany({
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
