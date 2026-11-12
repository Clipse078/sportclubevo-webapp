/**
 * SCE-CD-02R9 — when workspace documentation is editable vs read-only.
 */

import type { MeetingStatus, ReviewWorkflowStage } from "@prisma/client";
import { canEditDraft } from "@/lib/governance/review-stage";

export type MeetingWorkspaceLockContext = {
  status: MeetingStatus;
  reviewStage: ReviewWorkflowStage;
  protocolApprovalRequired: boolean;
};

export function isMeetingHistoricallyClosed(status: MeetingStatus): boolean {
  return status === "COMPLETED";
}

export function isMeetingCancelled(status: MeetingStatus): boolean {
  return status === "CANCELLED";
}

/** Ordinary editing blocked on closed meetings (reopen required). */
export function canEditMeetingDocumentation(ctx: MeetingWorkspaceLockContext): boolean {
  if (isMeetingCancelled(ctx.status)) return false;
  if (isMeetingHistoricallyClosed(ctx.status)) return false;
  if (ctx.protocolApprovalRequired && !canEditDraft(ctx.reviewStage)) {
    return false;
  }
  return true;
}

export function canConfigureMeetingApprovals(ctx: MeetingWorkspaceLockContext): boolean {
  return canEditMeetingDocumentation(ctx);
}

/** Approval votes stay permitted when the meeting is closed but Beschluss Freigabe is pending. */
export function canActOnMeetingApprovals(ctx: MeetingWorkspaceLockContext): boolean {
  if (isMeetingCancelled(ctx.status)) return false;
  return true;
}
