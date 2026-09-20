/**
 * AUFGABEN-05 — normalized PersonalAction read-model types (no persistence).
 */

export type PersonalActionSourceType =
  | "TASK"
  | "ATTENDANCE_RESPONSE"
  // Future adapters (not implemented in foundation):
  | "REGISTRATION_ACTION"
  | "DOCUMENT_ACTION";

/** Presentation/actionability for the personal inbox (not TaskStatus / ParticipationResponseStatus). */
export type PersonalActionStatus = "ACTIONABLE" | "RESOLVED";

export type PersonalActionKind = "TASK" | "PARTICIPATION_RESPONSE";

export type PersonalActionSubject = {
  personId: string;
  displayName: string;
};

export type PersonalActionContext = {
  teamDisplayName?: string;
  eventKind?: "TRAINING" | "MATCH" | "TOURNAMENT";
  eventKindLabel?: string;
  eventTitle?: string;
  /** Upcoming event start (sort/display only — not an RSVP deadline). */
  eventStartAt?: string | null;
};

export type PersonalActionInlineActions = {
  participation?: {
    teamSeasonId: string;
    eventKind: "TRAINING" | "MATCH" | "TOURNAMENT";
    trainingSessionId?: string;
    eventId?: string;
    allowedResponses: readonly ("YES" | "NO" | "MAYBE")[];
  };
};

export type PersonalAction = {
  id: string;
  sourceType: PersonalActionSourceType;
  /** Canonical row id when materialized; null for derived open obligations. */
  sourceId: string | null;
  subject?: PersonalActionSubject;
  title: string;
  subtitle?: string | null;
  dueAt: string | null;
  status: "ACTIONABLE";
  href: string | null;
  actionKind: PersonalActionKind;
  context?: PersonalActionContext;
  inlineActions?: PersonalActionInlineActions;
  /** Task ordering tie-break (ISO). */
  createdAt?: string;
  priority?: string;
};

export type PersonalActionCounts = {
  totalActionable: number;
  taskActionable: number;
  attendanceActionable: number;
};

export type LoadPersonalActionsArgs = {
  tenantId: string;
  userId: string;
  /** When omitted, resolved from live effective permissions. */
  permissionKeys?: readonly string[];
  limit?: number;
  now?: Date;
};
