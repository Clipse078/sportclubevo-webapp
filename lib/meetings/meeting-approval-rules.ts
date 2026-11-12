/**
 * SCE-CD-02R9 — quorum evaluation for meeting / Beschluss approvals.
 */

import type { MeetingApprovalRule, MeetingApprovalDecisionKind } from "@prisma/client";

export type ApproverVoteSummary = {
  approverPersonId: string;
  decision: MeetingApprovalDecisionKind;
};

export function meetingApprovalRuleLabel(rule: MeetingApprovalRule): string {
  switch (rule) {
    case "ALL":
      return "Alle ausgewählten Personen";
    case "ONE":
      return "Mindestens eine Person";
    case "MAJORITY":
      return "Mehrheit der ausgewählten Personen";
    default:
      return rule;
  }
}

function countApprovals(votes: ApproverVoteSummary[]): number {
  return votes.filter((v) => v.decision === "APPROVED").length;
}

function countRejections(votes: ApproverVoteSummary[]): number {
  return votes.filter((v) => v.decision === "REJECTED" || v.decision === "CHANGES_REQUESTED").length;
}

/**
 * Returns whether the approval rule is satisfied, and a coarse aggregate hint.
 */
export function evaluateMeetingApprovalRule(input: {
  rule: MeetingApprovalRule;
  approverPersonIds: string[];
  votes: ApproverVoteSummary[];
}): {
  satisfied: boolean;
  hasChangesRequested: boolean;
  hasRejection: boolean;
} {
  const pool = input.approverPersonIds;
  if (pool.length === 0) {
    return { satisfied: false, hasChangesRequested: false, hasRejection: false };
  }

  const poolVotes = input.votes.filter((v) => pool.includes(v.approverPersonId));
  const hasChangesRequested = poolVotes.some((v) => v.decision === "CHANGES_REQUESTED");
  const hasRejection = poolVotes.some((v) => v.decision === "REJECTED");
  const approved = countApprovals(poolVotes);
  const rejected = countRejections(poolVotes);

  switch (input.rule) {
    case "ONE":
      if (hasRejection && approved === 0) {
        return { satisfied: false, hasChangesRequested, hasRejection };
      }
      return { satisfied: approved >= 1, hasChangesRequested, hasRejection };
    case "MAJORITY": {
      const needed = Math.floor(pool.length / 2) + 1;
      if (rejected >= needed) {
        return { satisfied: false, hasChangesRequested, hasRejection };
      }
      return { satisfied: approved >= needed, hasChangesRequested, hasRejection };
    }
    case "ALL":
    default: {
      if (hasRejection || hasChangesRequested) {
        return { satisfied: false, hasChangesRequested, hasRejection };
      }
      const votedIds = new Set(poolVotes.map((v) => v.approverPersonId));
      const allApproved =
        pool.every((id) => votedIds.has(id)) &&
        poolVotes.every((v) => v.decision === "APPROVED");
      return { satisfied: allApproved, hasChangesRequested, hasRejection };
    }
  }
}
