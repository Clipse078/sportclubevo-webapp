import type { SceActivityCreateKind } from "@/lib/sce/activity-composer/types";
import type { SceActivityApprovalDecision } from "./types";

/** Validator workspace: Freigaben — pending count badge on nav entry. */
export type SceActivityApprovalInboxItem = {
  submissionId: string;
  activityId: string;
  activityType: SceActivityCreateKind;
  revisionId: string;
  teamLabel?: string;
  scheduleLabel: string;
  locationLabel?: string;
  creatorPersonId: string;
  creatorDisplayName: string;
  submittedAt: string;
};

export type SceActivityApprovalInboxReviewAction = SceActivityApprovalDecision;

export const SCE_ACTIVITY_APPROVAL_INBOX_ACTION_LABELS: Record<
  SceActivityApprovalDecision,
  string
> = {
  APPROVE: "Freigeben",
  REQUEST_CHANGES: "Änderungen anfordern",
  REJECT: "Ablehnen",
};

/**
 * Review opens canonical activity presentation — reuse SceActivityPresentationModel at implementation.
 */
export const SCE_ACTIVITY_APPROVAL_INBOX_PRESENTATION_REUSE =
  "Freigaben review must open the canonical activity context; no disconnected mini-card representation.";

export const SCE_ACTIVITY_APPROVAL_INBOX_DEFERRED =
  "01B-R3 defines inbox contract only; Freigaben UI ships with 01H presentation rollout gate.";
