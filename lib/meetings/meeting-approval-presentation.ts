/**
 * SCE-CD-02R9R1 — German labels and UI gating for meeting approvals.
 */

import type {
  MeetingApprovalAggregateStatus,
  MeetingApprovalDecisionKind,
  MeetingApprovalRule,
  MeetingStatus,
  ReviewWorkflowStage,
} from "@prisma/client";

export function parseApproverPersonIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw) {
    if (typeof id !== "string" || !id.trim()) continue;
    const trimmed = id.trim();
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function meetingApprovalAggregateStatusLabel(status: MeetingApprovalAggregateStatus): string {
  switch (status) {
    case "NOT_REQUIRED":
      return "Nicht erforderlich";
    case "PENDING":
      return "Ausstehend";
    case "APPROVED":
      return "Genehmigt";
    case "CHANGES_REQUESTED":
      return "Änderungen angefordert";
    case "REJECTED":
      return "Abgelehnt";
    default:
      return status;
  }
}

export function meetingApprovalVoteDecisionLabel(decision: MeetingApprovalDecisionKind): string {
  switch (decision) {
    case "APPROVED":
      return "Genehmigt";
    case "CHANGES_REQUESTED":
      return "Änderungen angefordert";
    case "REJECTED":
      return "Abgelehnt";
    default:
      return decision;
  }
}

export function protocolReviewStageStatusLabel(
  reviewStage: ReviewWorkflowStage,
  protocolApprovalRequired: boolean,
): string {
  if (!protocolApprovalRequired) return "Nicht erforderlich";
  switch (reviewStage) {
    case "DRAFT":
      return "Entwurf — noch nicht eingereicht";
    case "SUBMITTED":
      return "Zur Freigabe";
    case "APPROVED":
      return "Genehmigt";
    case "REJECTED":
      return "Änderungen erforderlich";
    default:
      return reviewStage;
  }
}

export function canConfigureProtocolApproval(input: {
  status: MeetingStatus;
  reviewStage: ReviewWorkflowStage;
}): boolean {
  if (input.status === "CANCELLED" || input.status === "COMPLETED") return false;
  return input.reviewStage === "DRAFT" || input.reviewStage === "REJECTED";
}

export function canConfigureDecisionApproval(input: {
  meetingStatus: MeetingStatus;
  approvalStatus: MeetingApprovalAggregateStatus;
}): boolean {
  if (input.meetingStatus === "CANCELLED" || input.meetingStatus === "COMPLETED") return false;
  if (input.approvalStatus === "APPROVED") return false;
  if (input.approvalStatus === "PENDING") return false;
  return true;
}

export function canSubmitProtocolForApproval(input: {
  protocolApprovalRequired: boolean;
  reviewStage: ReviewWorkflowStage;
  status: MeetingStatus;
  approverCount: number;
}): boolean {
  if (!input.protocolApprovalRequired) return false;
  if (input.status === "COMPLETED" || input.status === "CANCELLED") return false;
  if (input.approverCount < 1) return false;
  return input.reviewStage === "DRAFT" || input.reviewStage === "REJECTED";
}

export function canSubmitDecisionForApproval(input: {
  approvalRequired: boolean;
  approvalStatus: MeetingApprovalAggregateStatus;
  approverCount: number;
}): boolean {
  if (!input.approvalRequired) return false;
  if (input.approverCount < 1) return false;
  return (
    input.approvalStatus === "NOT_REQUIRED" ||
    input.approvalStatus === "CHANGES_REQUESTED" ||
    input.approvalStatus === "REJECTED"
  );
}

export function validateApprovalConfig(input: {
  approvalRequired: boolean;
  approverPersonIds: string[];
}): string | null {
  if (!input.approvalRequired) return null;
  if (input.approverPersonIds.length < 1) {
    return "Mindestens eine Person muss ausgewählt werden.";
  }
  return null;
}

export const MEETING_APPROVAL_RULES: MeetingApprovalRule[] = ["ALL", "ONE", "MAJORITY"];
