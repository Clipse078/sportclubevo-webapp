/**
 * SCE-CD-02R9 — server-side meeting lifecycle mutations (conduct, close, reopen, cancel).
 */

import { prisma } from "@/lib/db/prisma";
import type { MeetingStatus, ReviewWorkflowStage } from "@prisma/client";
import { ReviewWorkflowStage as Stage } from "@prisma/client";
import { evaluateMeetingApprovalRule } from "@/lib/meetings/meeting-approval-rules";
import { hashMeetingProtocolContent } from "@/lib/meetings/meeting-content-hash";

export type MeetingLifecycleRow = {
  id: string;
  tenantId: string;
  status: MeetingStatus;
  title: string;
  description: string | null;
  reviewStage: ReviewWorkflowStage;
  protocolApprovalRequired: boolean;
  protocolApprovalRule: import("@prisma/client").MeetingApprovalRule;
  protocolApproverPersonIds: unknown;
  protocolApprovedContentHash: string | null;
  protocolContentRevision: number;
  conductedAt: Date | null;
};

function parsePersonIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function assertProtocolApprovalSatisfied(meeting: MeetingLifecycleRow): Promise<{
  ok: true;
} | {
  ok: false;
  code: "APPROVAL_REQUIRED" | "APPROVAL_PENDING" | "APPROVAL_REJECTED";
  message: string;
}> {
  if (!meeting.protocolApprovalRequired) {
    return { ok: true };
  }

  const approverPersonIds = parsePersonIds(meeting.protocolApproverPersonIds);
  if (approverPersonIds.length === 0) {
    return {
      ok: false,
      code: "APPROVAL_REQUIRED",
      message: "Freigabe ist aktiviert, aber es sind keine Prüfer ausgewählt.",
    };
  }

  if (meeting.reviewStage === Stage.REJECTED) {
    return {
      ok: false,
      code: "APPROVAL_REJECTED",
      message: "Protokoll wurde abgelehnt oder Änderungen angefordert.",
    };
  }

  if (meeting.reviewStage !== Stage.APPROVED) {
    const votes = await prisma.meetingProtocolApprovalVote.findMany({
      where: { meetingId: meeting.id },
      select: { approverPersonId: true, decision: true },
    });
    const evalResult = evaluateMeetingApprovalRule({
      rule: meeting.protocolApprovalRule,
      approverPersonIds,
      votes,
    });
    if (!evalResult.satisfied) {
      return {
        ok: false,
        code: "APPROVAL_PENDING",
        message: "Protokoll-Freigabe ist noch nicht vollständig.",
      };
    }
  }

  return { ok: true };
}

export async function loadProtocolContentHash(meetingId: string): Promise<string> {
  const [meeting, agenda, decisions] = await Promise.all([
    prisma.meeting.findUniqueOrThrow({
      where: { id: meetingId },
      select: {
        protocolContentRevision: true,
        title: true,
        description: true,
      },
    }),
    prisma.meetingAgendaItem.findMany({
      where: { meetingId },
      orderBy: { orderIndex: "asc" },
      select: { title: true },
    }),
    prisma.meetingDecision.findMany({
      where: { meetingId },
      orderBy: { orderIndex: "asc" },
      select: { title: true },
    }),
  ]);
  return hashMeetingProtocolContent({
    revision: meeting.protocolContentRevision,
    title: meeting.title,
    description: meeting.description,
    agendaTitles: agenda.map((a) => a.title),
    decisionTitles: decisions.map((d) => d.title),
  });
}

export async function markMeetingConducted(input: {
  meeting: MeetingLifecycleRow;
  actorUserId: string;
}): Promise<void> {
  if (input.meeting.status === "CANCELLED" || input.meeting.status === "COMPLETED") {
    throw new Error("INVALID_STATE");
  }
  if (input.meeting.conductedAt) return;

  await prisma.$transaction([
    prisma.meeting.update({
      where: { id: input.meeting.id, tenantId: input.meeting.tenantId },
      data: {
        conductedAt: new Date(),
        conductedByUserId: input.actorUserId,
      },
    }),
    prisma.meetingLifecycleEvent.create({
      data: {
        tenantId: input.meeting.tenantId,
        meetingId: input.meeting.id,
        kind: "CONDUCTED",
        actorUserId: input.actorUserId,
      },
    }),
  ]);
}

export async function closeMeeting(input: {
  meeting: MeetingLifecycleRow;
  actorUserId: string;
}): Promise<void> {
  if (input.meeting.status === "CANCELLED") {
    throw new Error("CANCELLED");
  }
  if (input.meeting.status === "COMPLETED") {
    return;
  }

  const approval = await assertProtocolApprovalSatisfied(input.meeting);
  if (!approval.ok) {
    throw new Error(approval.code);
  }

  const contentHash = await loadProtocolContentHash(input.meeting.id);

  await prisma.$transaction([
    prisma.meeting.update({
      where: { id: input.meeting.id, tenantId: input.meeting.tenantId },
      data: {
        status: "COMPLETED",
        closedAt: new Date(),
        closedByUserId: input.actorUserId,
        protocolApprovedContentHash: input.meeting.protocolApprovalRequired ? contentHash : null,
      },
    }),
    prisma.meetingLifecycleEvent.create({
      data: {
        tenantId: input.meeting.tenantId,
        meetingId: input.meeting.id,
        kind: "CLOSED",
        actorUserId: input.actorUserId,
        metadata: { protocolApprovalRequired: input.meeting.protocolApprovalRequired },
      },
    }),
  ]);
}

export async function reopenMeeting(input: {
  meeting: MeetingLifecycleRow;
  actorUserId: string;
  reason: string;
}): Promise<void> {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw new Error("REASON_REQUIRED");
  }
  if (input.meeting.status !== "COMPLETED") {
    throw new Error("NOT_CLOSED");
  }

  await prisma.$transaction([
    prisma.meeting.update({
      where: { id: input.meeting.id, tenantId: input.meeting.tenantId },
      data: {
        status: "PLANNED",
        closedAt: null,
        closedByUserId: null,
        lastReopenReason: reason,
        protocolContentRevision: { increment: 1 },
        reviewStage:
          input.meeting.protocolApprovalRequired && input.meeting.reviewStage === Stage.APPROVED
            ? Stage.DRAFT
            : input.meeting.reviewStage,
      },
    }),
    prisma.meetingLifecycleEvent.create({
      data: {
        tenantId: input.meeting.tenantId,
        meetingId: input.meeting.id,
        kind: "REOPENED",
        actorUserId: input.actorUserId,
        reason,
      },
    }),
  ]);
}

export async function submitProtocolForApproval(input: {
  meeting: MeetingLifecycleRow;
  actorUserId: string;
}): Promise<void> {
  if (!input.meeting.protocolApprovalRequired) {
    throw new Error("APPROVAL_NOT_ENABLED");
  }
  if (input.meeting.status === "COMPLETED" || input.meeting.status === "CANCELLED") {
    throw new Error("INVALID_STATE");
  }
  const approverPersonIds = parsePersonIds(input.meeting.protocolApproverPersonIds);
  if (approverPersonIds.length === 0) {
    throw new Error("NO_APPROVERS");
  }

  await prisma.$transaction([
    prisma.meetingProtocolApprovalVote.deleteMany({ where: { meetingId: input.meeting.id } }),
    prisma.meeting.update({
      where: { id: input.meeting.id, tenantId: input.meeting.tenantId },
      data: { reviewStage: Stage.SUBMITTED },
    }),
    prisma.meetingLifecycleEvent.create({
      data: {
        tenantId: input.meeting.tenantId,
        meetingId: input.meeting.id,
        kind: "PROTOCOL_SUBMITTED",
        actorUserId: input.actorUserId,
      },
    }),
  ]);
}
