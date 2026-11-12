import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { syncInitiativeStoredProgress } from "@/lib/club-development/initiative-progress";

export async function refreshInitiativeProgressForTaskContext(
  tenantId: string,
  contextType: TaskContextType | null | undefined,
  contextId: string | null | undefined,
): Promise<void> {
  if (!contextType || !contextId) return;

  const initiativeIds = new Set<string>();

  if (contextType === TaskContextType.INITIATIVE) {
    initiativeIds.add(contextId);
  }

  if (contextType === TaskContextType.MEETING_DECISION) {
    const decision = await prisma.meetingDecision.findFirst({
      where: { id: contextId, meeting: { tenantId } },
      select: {
        sourceAgendaItem: { select: { initiativeId: true } },
      },
    });
    const initiativeId = decision?.sourceAgendaItem?.initiativeId;
    if (initiativeId) initiativeIds.add(initiativeId);
  }

  await Promise.all(
    [...initiativeIds].map((initiativeId) =>
      syncInitiativeStoredProgress(tenantId, initiativeId).catch(() => undefined),
    ),
  );
}
