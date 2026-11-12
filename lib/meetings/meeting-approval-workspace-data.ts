/**
 * Server-only — approval votes and labels for meeting workspace UI.
 */

import { prisma } from "@/lib/db/prisma";
import { personLabelFromRecord } from "@/lib/meetings/meeting-person-display";
import { parseApproverPersonIds } from "@/lib/meetings/meeting-approval-presentation";
import type { MeetingApprovalDecisionKind } from "@prisma/client";

export type MeetingApprovalVoteView = {
  approverPersonId: string;
  approverLabel: string;
  decision: MeetingApprovalDecisionKind;
  comment: string | null;
  decidedAt: Date | null;
};

export type MeetingApprovalWorkspaceData = {
  protocolVotes: MeetingApprovalVoteView[];
  protocolApproverLabels: Record<string, string>;
  decisionVotesByDecisionId: Record<string, MeetingApprovalVoteView[]>;
  decisionApproverLabelsByDecisionId: Record<string, Record<string, string>>;
  protocolSubmittedAt: Date | null;
};

async function loadPersonLabelMap(tenantId: string, personIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(personIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await prisma.person.findMany({
    where: { tenantId, id: { in: unique }, isActive: true },
    select: { id: true, displayName: true, firstName: true, lastName: true },
  });
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.id, personLabelFromRecord(row));
  }
  return map;
}

function mapVotes(
  rows: Array<{
    approverPersonId: string;
    decision: MeetingApprovalDecisionKind;
    comment: string | null;
    decidedAt: Date;
  }>,
  labels: Map<string, string>,
): MeetingApprovalVoteView[] {
  return rows.map((row) => ({
    approverPersonId: row.approverPersonId,
    approverLabel: labels.get(row.approverPersonId) ?? "Unbekannte Person",
    decision: row.decision,
    comment: row.comment,
    decidedAt: row.decidedAt,
  }));
}

export async function getMeetingApprovalWorkspaceData(input: {
  tenantId: string;
  meetingId: string;
  protocolApproverPersonIds: unknown;
  decisionApproverIdsByDecisionId: Record<string, unknown>;
}): Promise<MeetingApprovalWorkspaceData> {
  const protocolPool = parseApproverPersonIds(input.protocolApproverPersonIds);
  const decisionPools = Object.entries(input.decisionApproverIdsByDecisionId).map(([decisionId, raw]) => ({
    decisionId,
    pool: parseApproverPersonIds(raw),
  }));

  const allPersonIds = [
    ...protocolPool,
    ...decisionPools.flatMap((d) => d.pool),
  ];

  const [labels, protocolVoteRows, decisionVoteRows, submitEvent] = await Promise.all([
    loadPersonLabelMap(input.tenantId, allPersonIds),
    prisma.meetingProtocolApprovalVote.findMany({
      where: { meetingId: input.meetingId, tenantId: input.tenantId },
      select: {
        approverPersonId: true,
        decision: true,
        comment: true,
        decidedAt: true,
      },
      orderBy: { decidedAt: "asc" },
    }),
    prisma.meetingDecisionApprovalVote.findMany({
      where: {
        tenantId: input.tenantId,
        decisionId: { in: Object.keys(input.decisionApproverIdsByDecisionId) },
      },
      select: {
        decisionId: true,
        approverPersonId: true,
        decision: true,
        comment: true,
        decidedAt: true,
      },
      orderBy: { decidedAt: "asc" },
    }),
    prisma.meetingLifecycleEvent.findFirst({
      where: { meetingId: input.meetingId, kind: "PROTOCOL_SUBMITTED" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const protocolApproverLabels: Record<string, string> = {};
  for (const id of protocolPool) {
    protocolApproverLabels[id] = labels.get(id) ?? "Unbekannte Person";
  }

  const decisionVotesByDecisionId: Record<string, MeetingApprovalVoteView[]> = {};
  const decisionApproverLabelsByDecisionId: Record<string, Record<string, string>> = {};

  for (const { decisionId, pool } of decisionPools) {
    const approverLabels: Record<string, string> = {};
    for (const id of pool) {
      approverLabels[id] = labels.get(id) ?? "Unbekannte Person";
    }
    decisionApproverLabelsByDecisionId[decisionId] = approverLabels;
    const rows = decisionVoteRows.filter((v) => v.decisionId === decisionId);
    decisionVotesByDecisionId[decisionId] = mapVotes(rows, labels);
  }

  return {
    protocolVotes: mapVotes(protocolVoteRows, labels),
    protocolApproverLabels,
    decisionVotesByDecisionId,
    decisionApproverLabelsByDecisionId,
    protocolSubmittedAt: submitEvent?.createdAt ?? null,
  };
}
