import { ClubMeldungHistoryEventType } from "@prisma/client";
import { createTask } from "@/lib/tasks/task-service";
import type { TaskServiceContext } from "@/lib/tasks/types";
import { recordClubMeldungHistory } from "./history-service";
import { canMutateMeldungInternal, type ClubMeldungAccessContext } from "./access";
import { ClubMeldungServiceError } from "./meldung-service";
import { prisma } from "@/lib/db/prisma";

export async function createClubMeldungLinkedTask(
  ctx: TaskServiceContext,
  input: {
    meldungId: string;
    title: string;
    description?: string | null;
    assigneeUserIds?: string[];
    access: ClubMeldungAccessContext;
  },
) {
  const meldung = await prisma.clubMeldung.findFirst({
    where: { id: input.meldungId, tenantId: ctx.tenantId },
    include: { collaborators: { select: { userId: true } } },
  });
  if (!meldung) throw new ClubMeldungServiceError("Meldung nicht gefunden", "NOT_FOUND");

  const accessCtx: ClubMeldungAccessContext = {
    ...input.access,
    collaboratorUserIds:
      input.access.collaboratorUserIds ?? meldung.collaborators.map((c) => c.userId),
  };
  if (!canMutateMeldungInternal(meldung, accessCtx)) {
    throw new ClubMeldungServiceError("Keine Berechtigung", "FORBIDDEN");
  }

  const task = await createTask(ctx, {
    title: input.title,
    description: input.description ?? undefined,
    contextType: "CLUB_MELDUNG",
    contextId: meldung.id,
    assigneeUserIds: input.assigneeUserIds,
  });

  await prisma.$transaction(async (tx) => {
    await recordClubMeldungHistory(tx, {
      tenantId: ctx.tenantId,
      meldungId: meldung.id,
      eventType: ClubMeldungHistoryEventType.FIELD_UPDATED,
      actorUserId: ctx.userId,
      payloadJson: { linkedTaskId: task.id, provenance: "CLUB_MELDUNG" },
    });
  });

  return task;
}