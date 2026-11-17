/**
 * Isolated meeting-detail workspace fixtures (no live DB; slug is fictional).
 */
import type { MeetingApprovalWorkspaceData } from "@/lib/meetings/meeting-approval-workspace-data";
import type { MeetingLiveData, MeetingSubEntities } from "@/lib/meetings/queries";

export const meetingDetailWorkspaceMeetingFixture: MeetingLiveData = {
  id: "meeting-fixture-1",
  slug: "fixture-board-sitzung",
  title: "Fixture Vorstandssitzung",
  description: "Isolierter Fixture-Datensatz für Loader-Tests.",
  meetingDate: new Date("2026-03-10T19:00:00.000Z"),
  location: "Clubhaus",
  attendeeCount: 3,
  plannedDurationMin: 60,
  status: "PLANNED",
  conductedAt: null,
  closedAt: null,
  protocolApprovalRequired: false,
  protocolApprovalRule: null,
  protocolApproverPersonIds: [],
  protocolContentRevision: 0,
  lastReopenReason: null,
  reviewStage: "DRAFT",
  requiresFourEyeReview: false,
  visibilityScope: "ORGANISATION",
  createdByUserId: "user-fixture-1",
  visibleRoleRefs: [],
  visibleUserRefs: [],
  visibleTeamRefs: [],
  visibleOrgUnitRefs: [],
  visiblePersonRefs: [],
  visibleTargetGroupRefs: [],
  reviewedByUserId: null,
  reviewedAt: null,
  createdAt: new Date("2026-03-01T00:00:00.000Z"),
  updatedAt: new Date("2026-03-01T00:00:00.000Z"),
};

export const meetingDetailWorkspaceSubEntitiesFixture: MeetingSubEntities = {
  agendaItems: [],
  decisions: [],
  actions: [],
  participants: [],
};

export const meetingDetailWorkspaceApprovalFixture: MeetingApprovalWorkspaceData = {
  protocolVotes: [],
  protocolApproverLabels: {},
  decisionVotesByDecisionId: {},
  decisionApproverLabelsByDecisionId: {},
  protocolSubmittedAt: null,
};