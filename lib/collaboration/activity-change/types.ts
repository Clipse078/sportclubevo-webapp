/**
 * SCE-COLLAB-01A — canonical activity change representation (domain-agnostic).
 */

export const ACTIVITY_COLLABORATION_DOMAINS = [
  "TRAINING",
  "MATCH",
  "TOURNAMENT",
  "CLUB_EVENT",
] as const;

export type ActivityCollaborationDomain = (typeof ACTIVITY_COLLABORATION_DOMAINS)[number];

export const ACTIVITY_CHANGE_FIELDS = [
  "DATE",
  "START_TIME",
  "END_TIME",
  "VENUE",
  "FACILITY",
  "RESOURCE",
  "STATUS",
] as const;

export type ActivityChangeField = (typeof ACTIVITY_CHANGE_FIELDS)[number];

export type ActivityChangeEntry = {
  field: ActivityChangeField;
  oldValue: string | null;
  newValue: string | null;
  displayOld: string | null;
  displayNew: string | null;
  significant: true;
};

export type ActivityChangeSet = {
  domain: ActivityCollaborationDomain;
  activityId: string;
  entries: ActivityChangeEntry[];
  fingerprint: string;
};

export type ActivityAudienceContext = {
  teamId: string;
  /** Present when the operational audience spans multiple SCE teams (e.g. tournaments). */
  teamIds?: string[];
  teamName: string;
  recipientPreviewLabel: string | null;
  effectiveRecipientCount: number | null;
  zeroRecipients: boolean;
};

export type ActivityChangeImpact = {
  worthy: boolean;
  activityTitle: string;
  activityScheduleLine: string | null;
  changeSet: ActivityChangeSet | null;
  audience: ActivityAudienceContext | null;
  canCommunicate: boolean;
};

export type ContextualCommunicationDraftPrefill = {
  kind: "ANNOUNCEMENT";
  subject: string;
  bodyText: string;
  teamId: string;
  audiencePreset: "ALL";
};
