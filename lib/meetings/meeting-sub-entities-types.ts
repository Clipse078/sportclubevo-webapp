import type {
  InitiativeStatus,
  MeetingActionStatus,
  MeetingAgendaItemStatus,
  MeetingApprovalAggregateStatus,
  MeetingApprovalRule,
  MeetingDecisionStatus,
  MeetingParticipantStatus,
} from "@prisma/client";

export type MeetingSubEntities = {
  agendaItems: Array<{
    id: string;
    title: string;
    notes: string | null;
    owner: string | null;
    ownerPersonId: string | null;
    durationMin: number | null;
    initiativeId: string | null;
    orderIndex: number;
    status: MeetingAgendaItemStatus;
    sourceAgendaItemId: string | null;
    initiative: {
      id: string;
      slug: string;
      title: string;
      summary: string | null;
      description: string | null;
      status: InitiativeStatus;
    } | null;
  }>;
  decisions: Array<{
    id: string;
    title: string;
    description: string | null;
    rationale: string | null;
    status: MeetingDecisionStatus;
    owner: string | null;
    ownerPersonId: string | null;
    orderIndex: number;
    sourceAgendaItemId: string | null;
    approvalRequired: boolean;
    approvalRule: MeetingApprovalRule;
    approverPersonIds: unknown;
    approvalStatus: MeetingApprovalAggregateStatus;
    approvalContentRevision: number;
    linkedRefs: unknown;
  }>;
  actions: Array<{
    id: string;
    title: string;
    description: string | null;
    expectedOutcome: string | null;
    owner: string | null;
    ownerPersonId: string | null;
    dueDate: Date | null;
    status: MeetingActionStatus;
    linkedRefs: unknown;
  }>;
  participants: Array<{
    id: string;
    name: string;
    role: string | null;
    status: MeetingParticipantStatus;
    userId: string | null;
    personId: string | null;
  }>;
};
