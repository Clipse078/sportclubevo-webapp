import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { TrainingComposerDraftPayload } from "./training-composer-draft-types";

export type TrainingDraftRecord = {
  id: string;
  lifecycleState: string;
  payload: TrainingComposerDraftPayload;
  resourceSelections: string[];
  revisionNumber: number;
};

function parsePayload(raw: unknown): TrainingComposerDraftPayload {
  return raw as TrainingComposerDraftPayload;
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

export async function saveTrainingComposerDraft(input: {
  tenantId: string;
  actorPersonId: string;
  draftId?: string | null;
  payload: TrainingComposerDraftPayload;
}): Promise<{ draftId: string }> {
  const resourceJson = input.payload.resources as unknown as Prisma.InputJsonValue;

  if (input.draftId) {
    const existing = await prisma.trainingComposerDraft.findFirst({
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
    await prisma.trainingComposerDraft.update({
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

  const created = await prisma.trainingComposerDraft.create({
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

export async function getTrainingComposerDraft(
  tenantId: string,
  draftId: string,
): Promise<TrainingDraftRecord | null> {
  const row = await prisma.trainingComposerDraft.findFirst({
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

export async function listTrainingComposerDraftsForManagement(tenantId: string) {
  return prisma.trainingComposerDraft.findMany({
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
