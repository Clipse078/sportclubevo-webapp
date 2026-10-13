import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  getTrainingComposerDraft,
  type TrainingDraftRecord,
} from "./training-draft-persistence";

const EDITABLE_LIFECYCLE = ["DRAFT", "CHANGES_REQUESTED"] as const;

export async function getTrainingComposerDraftForCreatorResume(input: {
  tenantId: string;
  draftId: string;
  creatorPersonId: string;
}): Promise<TrainingDraftRecord | null> {
  const row = await prisma.trainingComposerDraft.findFirst({
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
  return getTrainingComposerDraft(input.tenantId, row.id);
}
