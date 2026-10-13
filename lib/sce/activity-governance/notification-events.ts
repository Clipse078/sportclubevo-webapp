/** Contracts for 01K notification adoption — no delivery in 01B-R3. */
export const SCE_ACTIVITY_GOVERNANCE_NOTIFICATION_EVENTS = {
  ACTIVITY_SUBMITTED_FOR_APPROVAL: "ACTIVITY_SUBMITTED_FOR_APPROVAL",
  ACTIVITY_APPROVED: "ACTIVITY_APPROVED",
  ACTIVITY_CHANGES_REQUESTED: "ACTIVITY_CHANGES_REQUESTED",
  ACTIVITY_REJECTED: "ACTIVITY_REJECTED",
} as const;

export type SceActivityGovernanceNotificationEventKind =
  (typeof SCE_ACTIVITY_GOVERNANCE_NOTIFICATION_EVENTS)[keyof typeof SCE_ACTIVITY_GOVERNANCE_NOTIFICATION_EVENTS];

export type SceActivityGovernanceNotificationPayload = {
  event: SceActivityGovernanceNotificationEventKind;
  activityId: string;
  activityType: string;
  revisionId: string;
  creatorPersonId: string;
  recipientPersonIds?: readonly string[];
};
