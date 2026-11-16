export const MEETING_AGENDA_TIMER_STORAGE_VERSION = 2 as const;

export type MeetingAgendaTimerPhase = "idle" | "running" | "paused";

/** User-facing lifecycle — distinct from engine phase (idle includes “ready”). */
export type MeetingAgendaTimerLifecycle =
  | "none"
  | "ready"
  | "running"
  | "paused"
  | "expired";

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
  /** True once the active topic timer has been started at least once this session. */
  activeTopicHasStarted: boolean;
};

export type MeetingAgendaTimerVisualKind = "normal" | "warning" | "expired" | "overtime";

export type MeetingAgendaTimerPresentation = {
  kind: MeetingAgendaTimerVisualKind;
  label: string;
  display: string;
  remainingSec: number;
};