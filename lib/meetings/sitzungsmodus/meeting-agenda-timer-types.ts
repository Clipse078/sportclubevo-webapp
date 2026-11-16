export const MEETING_AGENDA_TIMER_STORAGE_VERSION = 1 as const;

export type MeetingAgendaTimerPhase = "idle" | "running" | "paused";

export type MeetingAgendaTopicTimerSnapshot = {
  remainingSec: number;
  phase: MeetingAgendaTimerPhase;
  budgetSec: number;
  temporaryDurationSec: number | null;
};

export type MeetingAgendaTimerScope = {
  meetingId: string;
  tenantId: string;
  userId: string;
};

export type MeetingAgendaTimerState = {
  v: typeof MEETING_AGENDA_TIMER_STORAGE_VERSION;
  scope: MeetingAgendaTimerScope;
  modeActive: boolean;
  activeAgendaItemId: string | null;
  phase: MeetingAgendaTimerPhase;
  remainingAtAnchorSec: number;
  anchorMs: number | null;
  budgetSec: number;
  temporaryDurationSec: number | null;
  topicSnapshots: Record<string, MeetingAgendaTopicTimerSnapshot>;
  chimeEnabled: boolean;
  chimedAt60ForTopicId: string | null;
  chimedAtZeroForTopicId: string | null;
};

export type MeetingAgendaTimerVisualKind = "normal" | "warning" | "expired" | "overtime";

export type MeetingAgendaTimerPresentation = {
  kind: MeetingAgendaTimerVisualKind;
  label: string;
  display: string;
  remainingSec: number;
};