/**
 * SCE-CD-03R3 — Process optional approval (Meetings 2.0 pattern reuse).
 */

import { prisma } from "@/lib/db/prisma";
import type {
  MeetingApprovalAggregateStatus,
  MeetingApprovalDecisionKind,
  MeetingApprovalRule,
} from "@prisma/client";
import { evaluateMeetingApprovalRule } from "@/lib/meetings/meeting-approval-rules";
import { assertApproverActsAsSelf } from "@/lib/meetings/meeting-person-payload";
import { createHash } from "node:crypto";

function parsePersonIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function hashProcessApprovalContent(input: {
  title: string;
  summary: string | null;
  description: string | null;
  revision: number;
}): string {
  const payload = JSON.stringify({
    title: input.title,
    summary: input.summary ?? "",
    description: input.description ?? "",
    revision: input.revision,
  });
  return createHash("sha256").update(payload).digest("hex");
}

export function computeProcessAggregateStatus(input: {
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

export async function recordProcessApprovalVote(input: {
  tenantId: string;
  processId: string;
  approverPersonId: string;
  actorUserId: string;
  actorPersonId: string | null;
  decision: MeetingApprovalDecisionKind;
  comment?: string | null;
  clientRequestId?: string | null;
}): Promise<{ aggregateStatus: MeetingApprovalAggregateStatus }> {
  const process = await prisma.clubDevelopmentProcess.findFirst({
    where: { id: input.processId, tenantId: input.tenantId },
    select: {
      id: true,
      title: true,
      summary: true,
      description: true,
      approvalRequired: true,
      approvalRule: true,
      approverPersonIds: true,
      approvalContentRevision: true,
      approvedContentHash: true,
      approvalStatus: true,
    },
  });
  if (!process || !process.approvalRequired) {
    throw new Error("APPROVAL_NOT_REQUIRED");
  }
  if (process.approvalStatus !== "PENDING") {
    throw new Error("NOT_AWAITING_APPROVAL");
  }

  const pool = parsePersonIds(process.approverPersonIds);
  if (!pool.includes(input.approverPersonId)) {
    throw new Error("NOT_AUTHORIZED_APPROVER");
  }
  await assertApproverActsAsSelf({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    actorPersonId: input.actorPersonId,
    approverPersonId: input.approverPersonId,
  });

  await prisma.clubDevelopmentProcessApprovalVote.upsert({
    where: {
      processId_approverPersonId: {
        processId: input.processId,
        approverPersonId: input.approverPersonId,
      },
    },
    create: {
      tenantId: input.tenantId,
      processId: input.processId,
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

  const votes = await prisma.clubDevelopmentProcessApprovalVote.findMany({
    where: { processId: input.processId },
    select: { approverPersonId: true, decision: true },
  });

  const aggregateStatus = computeProcessAggregateStatus({
    approvalRequired: process.approvalRequired,
    approvalRule: process.approvalRule,
    approverPersonIds: process.approverPersonIds,
    votes,
  });

  const contentHash = hashProcessApprovalContent({
    title: process.title,
    summary: process.summary,
    description: process.description,
    revision: process.approvalContentRevision,
  });

  await prisma.clubDevelopmentProcess.update({
    where: { id: input.processId },
    data: {
      approvalStatus: aggregateStatus,
      approvedContentHash:
        aggregateStatus === "APPROVED" ? contentHash : process.approvedContentHash,
    },
  });

  return { aggregateStatus };
}

export function shouldInvalidateProcessApproval(input: {
  approvedContentHash: string | null;
  title: string;
  summary: string | null;
  description: string | null;
  approvalContentRevision: number;
  approvalRequired: boolean;
  fieldsChanged: boolean;
}): boolean {
  if (!input.approvalRequired || !input.fieldsChanged) return false;
  if (!input.approvedContentHash) return false;
  const current = hashProcessApprovalContent({
    title: input.title,
    summary: input.summary,
    description: input.description,
    revision: input.approvalContentRevision,
  });
  return current !== input.approvedContentHash;
}
