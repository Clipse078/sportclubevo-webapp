/**
 * SCE-CD-02R9 — Beschluss approval votes and aggregate status.
 */

import { prisma } from "@/lib/db/prisma";
import type {
  MeetingApprovalAggregateStatus,
  MeetingApprovalDecisionKind,
  MeetingApprovalRule,
} from "@prisma/client";
import { evaluateMeetingApprovalRule } from "@/lib/meetings/meeting-approval-rules";
import {
  hashMeetingDecisionContent,
  materialContentChanged,
} from "@/lib/meetings/meeting-content-hash";
import { assertApproverActsAsSelf } from "@/lib/meetings/meeting-person-payload";

function parsePersonIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function computeDecisionAggregateStatus(input: {
  approvalRequired: boolean;
  approvalRule: MeetingApprovalRule;
  approverPersonIds: unknown;
  votes: { approverPersonId: string; decision: MeetingApprovalDecisionKind }[];
}): MeetingApprovalAggregateStatus {
  if (!input.approvalRequired) return "NOT_REQUIRED";
  const pool = parsePersonIds(input.approverPersonIds);
  if (pool.length === 0) return "PENDING";

  const result = evaluateMeetingApprovalRule({
    rule: input.approvalRule,
    approverPersonIds: pool,
    votes: input.votes,
  });

  if (result.satisfied) return "APPROVED";
  if (result.hasChangesRequested) return "CHANGES_REQUESTED";
  if (result.hasRejection) return "REJECTED";
  return "PENDING";
}

export async function recordDecisionApprovalVote(input: {
  tenantId: string;
  decisionId: string;
  meetingId: string;
  approverPersonId: string;
  actorUserId: string;
  actorPersonId: string | null;
  decision: MeetingApprovalDecisionKind;
  comment?: string | null;
  clientRequestId?: string | null;
}): Promise<{ aggregateStatus: MeetingApprovalAggregateStatus }> {
  const decision = await prisma.meetingDecision.findFirst({
    where: { id: input.decisionId, meetingId: input.meetingId },
    select: {
      id: true,
      title: true,
      description: true,
      approvalRequired: true,
      approvalRule: true,
      approverPersonIds: true,
      approvalContentRevision: true,
      approvedContentHash: true,
    },
  });
  if (!decision || !decision.approvalRequired) {
    throw new Error("APPROVAL_NOT_REQUIRED");
  }

  const pool = parsePersonIds(decision.approverPersonIds);
  if (!pool.includes(input.approverPersonId)) {
    throw new Error("NOT_AUTHORIZED_APPROVER");
  }
  await assertApproverActsAsSelf({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    actorPersonId: input.actorPersonId,
    approverPersonId: input.approverPersonId,
  });

  await prisma.meetingDecisionApprovalVote.upsert({
    where: {
      decisionId_approverPersonId: {
        decisionId: input.decisionId,
        approverPersonId: input.approverPersonId,
      },
    },
    create: {
      tenantId: input.tenantId,
      decisionId: input.decisionId,
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

  const votes = await prisma.meetingDecisionApprovalVote.findMany({
    where: { decisionId: input.decisionId },
    select: { approverPersonId: true, decision: true },
  });

  const aggregateStatus = computeDecisionAggregateStatus({
    approvalRequired: decision.approvalRequired,
    approvalRule: decision.approvalRule,
    approverPersonIds: decision.approverPersonIds,
    votes,
  });

  const contentHash = hashMeetingDecisionContent({
    title: decision.title,
    description: decision.description,
    revision: decision.approvalContentRevision,
  });

  await prisma.meetingDecision.update({
    where: { id: input.decisionId },
    data: {
      approvalStatus: aggregateStatus,
      approvedContentHash: aggregateStatus === "APPROVED" ? contentHash : decision.approvedContentHash,
    },
  });

  return { aggregateStatus };
}

export function shouldInvalidateDecisionApproval(input: {
  approvedContentHash: string | null;
  title: string;
  description: string | null;
  approvalContentRevision: number;
  approvalRequired: boolean;
  fieldsChanged: boolean;
}): boolean {
  if (!input.approvalRequired || !input.fieldsChanged) return false;
  if (!input.approvedContentHash) return false;
  const current = hashMeetingDecisionContent({
    title: input.title,
    description: input.description,
    revision: input.approvalContentRevision,
  });
  return materialContentChanged(input.approvedContentHash, current);
}
