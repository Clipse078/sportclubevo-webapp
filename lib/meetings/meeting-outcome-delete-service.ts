import "server-only";

import { TaskContextType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { parseMeetingLinkedRefs, buildMeetingActionLinkedRefs } from "@/lib/meetings/meeting-protocol-linked-refs";

export type MeetingDecisionDeletionImpact = {
  linkedPendenzCount: number;
  linkedTaskCount: number;
};

export type MeetingActionDeletionImpact = {
  linkedDecisionId: string | null;
  linkedDecisionTitle: string | null;
};

export async function getMeetingDecisionDeletionImpact(
  meetingId: string,
  tenantId: string,
  decisionId: string,
): Promise<MeetingDecisionDeletionImpact | null> {
  const decision = await prisma.meetingDecision.findFirst({
    where: { id: decisionId, meetingId, meeting: { tenantId } },
    select: { id: true },
  });
  if (!decision) return null;

  const [linkedPendenzCount, linkedTaskCount] = await Promise.all([
    countActionsLinkedToDecision(meetingId, decisionId),
    prisma.task.count({
      where: {
        tenantId,
        contextType: TaskContextType.MEETING_DECISION,
        contextId: decisionId,
      },
    }),
  ]);

  return { linkedPendenzCount, linkedTaskCount };
}

export async function deleteMeetingDecisionWithDependencies(
  meetingId: string,
  tenantId: string,
  decisionId: string,
): Promise<{ title: string } | null> {
  const decision = await prisma.meetingDecision.findFirst({
    where: { id: decisionId, meetingId, meeting: { tenantId } },
    select: { id: true, title: true },
  });
  if (!decision) return null;

  const freshImpact = await getMeetingDecisionDeletionImpact(meetingId, tenantId, decisionId);
  if (!freshImpact) return null;

  await prisma.$transaction(async (tx) => {
    const stillThere = await tx.meetingDecision.findFirst({
      where: { id: decisionId, meetingId, meeting: { tenantId } },
      select: { id: true },
    });
    if (!stillThere) return;

    const actions = await tx.meetingAction.findMany({
      where: { meetingId },
      select: { id: true, linkedRefs: true },
    });
    for (const action of actions) {
      const refs = parseMeetingLinkedRefs(action.linkedRefs);
      if (refs.decisionId !== decisionId) continue;
      await tx.meetingAction.update({
        where: { id: action.id },
        data: {
          linkedRefs: buildMeetingActionLinkedRefs({
            agendaItemId: refs.agendaItemId ?? null,
            decisionId: null,
          }),
        },
      });
    }

    await tx.task.updateMany({
      where: {
        tenantId,
        contextType: TaskContextType.MEETING_DECISION,
        contextId: decisionId,
      },
      data: {
        contextType: TaskContextType.MEETING,
        contextId: meetingId,
      },
    });

    await tx.meetingDecisionApprovalVote.deleteMany({ where: { decisionId } });
    await tx.meetingDecision.delete({ where: { id: decisionId } });
  });

  return { title: decision.title };
}

async function countActionsLinkedToDecision(meetingId: string, decisionId: string): Promise<number> {
  const actions = await prisma.meetingAction.findMany({
    where: { meetingId },
    select: { linkedRefs: true },
  });
  let count = 0;
  for (const action of actions) {
    const refs = parseMeetingLinkedRefs(action.linkedRefs);
    if (refs.decisionId === decisionId) count += 1;
  }
  return count;
}

export async function getMeetingActionDeletionImpact(
  meetingId: string,
  tenantId: string,
  actionId: string,
): Promise<MeetingActionDeletionImpact | null> {
  const action = await prisma.meetingAction.findFirst({
    where: { id: actionId, meetingId, meeting: { tenantId } },
    select: { id: true, linkedRefs: true },
  });
  if (!action) return null;

  const refs = parseMeetingLinkedRefs(action.linkedRefs);
  if (!refs.decisionId) {
    return { linkedDecisionId: null, linkedDecisionTitle: null };
  }

  const decision = await prisma.meetingDecision.findFirst({
    where: { id: refs.decisionId, meetingId, meeting: { tenantId } },
    select: { id: true, title: true },
  });

  return {
    linkedDecisionId: decision?.id ?? refs.decisionId,
    linkedDecisionTitle: decision?.title ?? null,
  };
}

export async function deleteMeetingActionRecord(
  meetingId: string,
  tenantId: string,
  actionId: string,
): Promise<{ title: string } | null> {
  const action = await prisma.meetingAction.findFirst({
    where: { id: actionId, meetingId, meeting: { tenantId } },
    select: { id: true, title: true },
  });
  if (!action) return null;

  const stillThere = await prisma.meetingAction.findFirst({
    where: { id: actionId, meetingId, meeting: { tenantId } },
    select: { id: true },
  });
  if (!stillThere) return null;

  await prisma.meetingAction.delete({ where: { id: actionId } });
  return { title: action.title };
}