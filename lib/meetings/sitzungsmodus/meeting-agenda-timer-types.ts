export const MEETING_AGENDA_TIMER_STORAGE_VERSION = 3 as const;

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
  /** Per-topic milestone seconds already chimed this run (10, 3, 2, 1, 0). */
  chimedMilestonesByTopicId: Record<string, number[]>;
  /** @deprecated v2 — migrated into chimedMilestonesByTopicId */
  chimedAt60ForTopicId?: string | null;
  /** @deprecated v2 */
  chimedAtZeroForTopicId?: string | null;
  /** True once the active topic timer has been started at least once this session. */
  activeTopicHasStarted: boolean;
};

export type MeetingAgendaTimerVisualKind = "normal" | "warning" | "final" | "expired" | "overtime";

export const MEETING_AGENDA_TIMER_CHIME_SECONDS = [10, 3, 2, 1, 0] as const;

export type MeetingAgendaTimerPresentation = {
  kind: MeetingAgendaTimerVisualKind;
  label: string;
  display: string;
  remainingSec: number;
};