import type {
  InitiativeStatus,
  MeetingActionStatus,
  MeetingAgendaItemStatus,
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
      status: InitiativeStatus;
    } | null;
  }>;
  decisions: Array<{
    id: string;
    title: string;
    description: string | null;
    status: MeetingDecisionStatus;
    owner: string | null;
    ownerPersonId: string | null;
    orderIndex: number;
  }>;
  actions: Array<{
    id: string;
    title: string;
    owner: string | null;
    ownerPersonId: string | null;
    dueDate: Date | null;
    status: MeetingActionStatus;
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
