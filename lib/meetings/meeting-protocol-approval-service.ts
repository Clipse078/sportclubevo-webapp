/**
 * SCE-CD-02R9 — protocol approval votes (orthogonal to reviewStage labels).
 */

import { prisma } from "@/lib/db/prisma";
import { ReviewWorkflowStage } from "@prisma/client";
import type { MeetingApprovalDecisionKind } from "@prisma/client";
import { evaluateMeetingApprovalRule } from "@/lib/meetings/meeting-approval-rules";
import { loadProtocolContentHash } from "@/lib/meetings/meeting-lifecycle-service";
import { assertApproverActsAsSelf } from "@/lib/meetings/meeting-person-payload";

function parsePersonIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function recordProtocolApprovalVote(input: {
  tenantId: string;
  meetingId: string;
  approverPersonId: string;
  actorUserId: string;
  actorPersonId: string | null;
  decision: MeetingApprovalDecisionKind;
  comment?: string | null;
  clientRequestId?: string | null;
}): Promise<{ reviewStage: ReviewWorkflowStage }> {
  const meeting = await prisma.meeting.findFirst({
    where: { id: input.meetingId, tenantId: input.tenantId },
    select: {
      id: true,
      protocolApprovalRequired: true,
      protocolApprovalRule: true,
      protocolApproverPersonIds: true,
      reviewStage: true,
      protocolContentRevision: true,
      title: true,
      description: true,
    },
  });
  if (!meeting?.protocolApprovalRequired) {
    throw new Error("APPROVAL_NOT_ENABLED");
  }

  const pool = parsePersonIds(meeting.protocolApproverPersonIds);
  if (!pool.includes(input.approverPersonId)) {
    throw new Error("NOT_AUTHORIZED_APPROVER");
  }
  await assertApproverActsAsSelf({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    actorPersonId: input.actorPersonId,
    approverPersonId: input.approverPersonId,
  });
  if (meeting.reviewStage !== ReviewWorkflowStage.SUBMITTED) {
    throw new Error("NOT_AWAITING_APPROVAL");
  }

  await prisma.meetingProtocolApprovalVote.upsert({
    where: {
      meetingId_approverPersonId: {
        meetingId: input.meetingId,
        approverPersonId: input.approverPersonId,
      },
    },
    create: {
      tenantId: input.tenantId,
      meetingId: input.meetingId,
      approverPersonId: input.approverPersonId,
      decision: input.decision,
      comment: input.comment?.trim() || null,
      decidedByUserId: input.actorUserId,
      clientRequestId: input.clientRequestId ?? null,
    },
    update: {
      decision: input.decision,
      comment: input.comment?.trim() || null,
      decidedByUserId: input.actorUserId,
      decidedAt: new Date(),
      clientRequestId: input.clientRequestId ?? null,
    },
  });

  const votes = await prisma.meetingProtocolApprovalVote.findMany({
    where: { meetingId: input.meetingId },
    select: { approverPersonId: true, decision: true },
  });

  const evalResult = evaluateMeetingApprovalRule({
    rule: meeting.protocolApprovalRule,
    approverPersonIds: pool,
    votes,
  });

  let nextStage: ReviewWorkflowStage = meeting.reviewStage;
  if (evalResult.satisfied) {
    nextStage = ReviewWorkflowStage.APPROVED;
  } else if (evalResult.hasChangesRequested) {
    nextStage = ReviewWorkflowStage.REJECTED;
  } else if (evalResult.hasRejection) {
    nextStage = ReviewWorkflowStage.REJECTED;
  }

  const contentHash =
    nextStage === ReviewWorkflowStage.APPROVED
      ? await loadProtocolContentHash(input.meetingId)
      : undefined;

  await prisma.meeting.update({
    where: { id: input.meetingId },
    data: {
      reviewStage: nextStage,
      reviewedAt: nextStage === ReviewWorkflowStage.APPROVED ? new Date() : undefined,
      reviewedByUserId: nextStage === ReviewWorkflowStage.APPROVED ? input.actorUserId : undefined,
      protocolApprovedContentHash: contentHash ?? undefined,
    },
  });

  return { reviewStage: nextStage };
}

export async function invalidateProtocolApprovalOnEdit(meetingId: string): Promise<void> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      protocolApprovalRequired: true,
      reviewStage: true,
      protocolApprovedContentHash: true,
      protocolContentRevision: true,
    },
  });
  if (!meeting?.protocolApprovalRequired || !meeting.protocolApprovedContentHash) return;

  const currentHash = await loadProtocolContentHash(meetingId);
  if (currentHash === meeting.protocolApprovedContentHash) return;

  await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      reviewStage: ReviewWorkflowStage.DRAFT,
      protocolContentRevision: { increment: 1 },
      protocolApprovedContentHash: null,
    },
  });
}
