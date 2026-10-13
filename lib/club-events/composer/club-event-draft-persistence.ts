import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ClubEventComposerDraftPayload } from "./club-event-composer-draft-types";

export type ClubEventDraftRecord = {
  id: string;
  lifecycleState: string;
  payload: ClubEventComposerDraftPayload;
  resourceSelections: string[];
  revisionNumber: number;
};

function parsePayload(raw: unknown): ClubEventComposerDraftPayload {
  return raw as ClubEventComposerDraftPayload;
}

function parseResources(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (row && typeof row === "object" && "facilityResourceId" in row) {
        return String((row as { facilityResourceId: string }).facilityResourceId);
      }
      return null;
    })
    .filter(Boolean) as string[];
}

export async function saveClubEventComposerDraft(input: {
  tenantId: string;
  actorPersonId: string;
  draftId?: string | null;
  payload: ClubEventComposerDraftPayload;
}): Promise<{ draftId: string }> {
  const resourceJson = input.payload.resources as unknown as Prisma.InputJsonValue;

  if (input.draftId) {
    const existing = await prisma.clubEventComposerDraft.findFirst({
      where: {
        id: input.draftId,
        tenantId: input.tenantId,
        lifecycleState: { in: ["DRAFT", "CHANGES_REQUESTED"] },
      },
    });
    if (!existing) {
      throw new Error("Entwurf nicht gefunden oder nicht mehr bearbeitbar.");
    }
    await prisma.clubEventComposerDraft.update({
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

  const created = await prisma.clubEventComposerDraft.create({
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

export async function getClubEventComposerDraft(
  tenantId: string,
  draftId: string,
): Promise<ClubEventDraftRecord | null> {
  const row = await prisma.clubEventComposerDraft.findFirst({
    where: { id: draftId, tenantId },
  });
  if (!row) return null;
  return {
    id: row.id,
    lifecycleState: row.lifecycleState,
    payload: parsePayload(row.payload),
    resourceSelections: parseResources(row.draftResourceSelections),
    revisionNumber: row.revisionNumber,
  };
}

export async function listClubEventComposerDraftsForManagement(tenantId: string) {
  return prisma.clubEventComposerDraft.findMany({
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
