/**
 * DASHBOARD-01 — canonical server-side personal relationship context.
 * Relationship establishes relevance; domain authorization establishes visibility.
 */

/** Sporting / assignment sources that make a team personally relevant. */
export type PersonalTeamRelationshipKind = "TRAINER" | "PLAYER" | "PERSON_ASSIGNMENT";

export type PersonalTeamRelationship = {
  teamId: string;
  teamName: string;
  /** Deduped kinds for this team (may include multiple). */
  kinds: PersonalTeamRelationshipKind[];
  /** Active PersonAssignment function keys scoped to this team (organisational labels only). */
  assignmentFunctionKeys: string[];
};

export type PersonalOrgUnitRelationshipSource = "USER_MEMBERSHIP" | "PERSON_MEMBERSHIP" | "PERSON_ASSIGNMENT";

export type PersonalOrgUnitRelationship = {
  orgUnitId: string;
  orgUnitName: string;
  sources: PersonalOrgUnitRelationshipSource[];
  assignmentFunctionKeys: string[];
};

export type PersonalAssignmentRelationship = {
  assignmentId: string;
  orgUnitId: string;
  orgUnitName: string;
  teamId: string | null;
  teamName: string | null;
  functionKey: string;
};

export type PersonalContextActor = {
  tenantId: string;
  userId: string;
  personId: string | null;
  hasLinkedPerson: boolean;
  hasActiveTenantMembership: boolean;
};

export type PersonalContext = PersonalContextActor & {
  teams: PersonalTeamRelationship[];
  orgUnits: PersonalOrgUnitRelationship[];
  assignments: PersonalAssignmentRelationship[];
};

/** Presentation-safe context descriptor for dashboard DTOs (no raw IDs/keys). */
export type PersonalContextDescriptorKind =
  | "TEAM_TRAINER"
  | "TEAM_PLAYER"
  | "TEAM_ASSIGNMENT"
  | "ORG_ASSIGNMENT"
  | "ORG_MEMBERSHIP"
  | "MEETING_PARTICIPANT"
  | "TASK_ASSIGNEE"
  | "GENERIC";

export type PersonalContextDescriptor = {
  kind: PersonalContextDescriptorKind;
  label: string;
  secondaryLabel?: string;
};
