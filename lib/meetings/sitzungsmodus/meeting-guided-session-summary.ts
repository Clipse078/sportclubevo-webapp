import type { MeetingAgendaItemStatus, MeetingActionStatus } from "@prisma/client";

export type GuidedAgendaItemForSummary = {
  id: string;
  title: string;
  status: MeetingAgendaItemStatus;
  position: number;
};

export type GuidedActionForSummary = {
  id: string;
  title: string;
  status: MeetingActionStatus;
};

export type GuidedSitzungsmodusSessionSummary = {
  openTopics: GuidedAgendaItemForSummary[];
  incompleteActions: GuidedActionForSummary[];
  hasGaps: boolean;
};

const TERMINAL_ACTION: MeetingActionStatus[] = ["DONE", "CANCELLED"];

export function buildGuidedSitzungsmodusSessionSummary(input: {
  agendaItems: GuidedAgendaItemForSummary[];
  actions: GuidedActionForSummary[];
}): GuidedSitzungsmodusSessionSummary {
  const openTopics = input.agendaItems.filter((item) => item.status === "OPEN");
  const incompleteActions = input.actions.filter((action) => !TERMINAL_ACTION.includes(action.status));
  return {
    openTopics,
    incompleteActions,
    hasGaps: openTopics.length > 0 || incompleteActions.length > 0,
  };
}