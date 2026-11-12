import type { MeetingApprovalAggregateStatus } from "@prisma/client";
import {
  parseApproverPersonIds,
  meetingApprovalAggregateStatusLabel,
  validateApprovalConfig,
} from "@/lib/meetings/meeting-approval-presentation";

export { parseApproverPersonIds, meetingApprovalAggregateStatusLabel, validateApprovalConfig };

export function canConfigureProcessApproval(input: {
  approvalStatus: MeetingApprovalAggregateStatus;
}): boolean {
  return input.approvalStatus === "NOT_REQUIRED" || input.approvalStatus === "PENDING";
}

export function canSubmitProcessForApproval(input: {
  approvalRequired: boolean;
  approvalStatus: MeetingApprovalAggregateStatus;
  approverCount: number;
}): boolean {
  if (!input.approvalRequired || input.approverCount < 1) return false;
  return (
    input.approvalStatus === "NOT_REQUIRED" ||
    input.approvalStatus === "CHANGES_REQUESTED" ||
    input.approvalStatus === "REJECTED"
  );
}
