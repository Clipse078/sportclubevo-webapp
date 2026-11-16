import type {
  MeetingAgendaTimerLifecycle,
  MeetingAgendaTimerPresentation,
  MeetingAgendaTimerScope,
  MeetingAgendaTimerState,
  MeetingAgendaTopicTimerSnapshot,
} from "./meeting-agenda-timer-types";
import { MEETING_AGENDA_TIMER_STORAGE_VERSION } from "./meeting-agenda-timer-types";

export function createMeetingAgendaTimerState(scope: MeetingAgendaTimerScope): MeetingAgendaTimerState {
  return {
    v: MEETING_AGENDA_TIMER_STORAGE_VERSION,
    scope,
    modeActive: false,
    activeAgendaItemId: null,
    phase: "idle",
    remainingAtAnchorSec: 0,
    anchorMs: null,
    budgetSec: 0,
    temporaryDurationSec: null,
    topicSnapshots: {},
    chimeEnabled: false,
    chimedAt60ForTopicId: null,
    chimedAtZeroForTopicId: null,
    activeTopicHasStarted: false,
  };
}

function snapshotIndicatesStarted(snapshot: MeetingAgendaTopicTimerSnapshot): boolean {
  return snapshot.phase !== "idle" || snapshot.remainingSec < snapshot.budgetSec;
}

function applyPlannedBudgetToIdleTopic(
  state: MeetingAgendaTimerState,
  agendaItemId: string,
  plannedDurationMin: number | null | undefined,
): MeetingAgendaTimerState {
  const budget = resolveAgendaBudgetSec({ plannedDurationMin });
  if (!budget) {
    return {
      ...state,
      activeAgendaItemId: agendaItemId,
      phase: "idle",
      remainingAtAnchorSec: 0,
      anchorMs: null,
      budgetSec: 0,
      temporaryDurationSec: null,
      activeTopicHasStarted: false,
      chimedAt60ForTopicId: null,
      chimedAtZeroForTopicId: null,
    };
  }
  return {
    ...state,
    activeAgendaItemId: agendaItemId,
    phase: "idle",
    remainingAtAnchorSec: budget.budgetSec,
    anchorMs: null,
    budgetSec: budget.budgetSec,
    temporaryDurationSec: budget.temporaryDurationSec,
    activeTopicHasStarted: false,
    chimedAt60ForTopicId: null,
    chimedAtZeroForTopicId: null,
  };
}

export function deriveMeetingAgendaTimerLifecycle(
  state: MeetingAgendaTimerState,
  remainingSec: number,
): MeetingAgendaTimerLifecycle {
  if (!state.modeActive || !state.activeAgendaItemId) return "none";
  if (state.phase === "running") {
    return remainingSec <= 0 ? "expired" : "running";
  }
  if (state.phase === "paused") {
    return remainingSec <= 0 && state.activeTopicHasStarted ? "expired" : "paused";
  }
  if (state.activeTopicHasStarted && remainingSec <= 0) return "expired";
  if (state.budgetSec > 0 || state.temporaryDurationSec != null) return "ready";
  return "none";
}

export function deriveRemainingSec(state: MeetingAgendaTimerState, nowMs: number): number {
  if (state.phase !== "running" || state.anchorMs == null) {
    return state.remainingAtAnchorSec;
  }
  const elapsedSec = (nowMs - state.anchorMs) / 1000;
  return state.remainingAtAnchorSec - elapsedSec;
}

function clampTopicSnapshot(snapshot: MeetingAgendaTopicTimerSnapshot): MeetingAgendaTopicTimerSnapshot {
  return {
    ...snapshot,
    remainingSec: Number.isFinite(snapshot.remainingSec) ? snapshot.remainingSec : 0,
  };
}

function persistActiveTopic(state: MeetingAgendaTimerState, nowMs: number): MeetingAgendaTimerState {
  if (!state.activeAgendaItemId) return state;
  const remainingSec = deriveRemainingSec(state, nowMs);
  const snapshot: MeetingAgendaTopicTimerSnapshot = {
    remainingSec,
    phase: state.phase === "running" ? "paused" : state.phase,
    budgetSec: state.budgetSec,
    temporaryDurationSec: state.temporaryDurationSec,
  };
  return {
    ...state,
    phase: "paused",
    anchorMs: null,
    remainingAtAnchorSec: remainingSec,
    topicSnapshots: {
      ...state.topicSnapshots,
      [state.activeAgendaItemId]: clampTopicSnapshot(snapshot),
    },
  };
}

export function startSitzungsmodus(state: MeetingAgendaTimerState): MeetingAgendaTimerState {
  return { ...state, modeActive: true };
}

export function endSitzungsmodus(state: MeetingAgendaTimerState, nowMs: number): MeetingAgendaTimerState {
  const paused = state.phase === "running" ? persistActiveTopic(state, nowMs) : state;
  return { ...paused, modeActive: false };
}

export function selectAgendaTopic(
  state: MeetingAgendaTimerState,
  agendaItemId: string,
  nowMs: number,
  plannedDurationMin?: number | null,
): MeetingAgendaTimerState {
  let next =
    state.activeAgendaItemId &&
    state.activeAgendaItemId !== agendaItemId &&
    (state.phase === "running" || state.phase === "paused")
      ? persistActiveTopic(state, nowMs)
      : state;
  if (next.activeAgendaItemId === agendaItemId) return next;

  const snapshot = next.topicSnapshots[agendaItemId];
  if (snapshot) {
    const hasStarted = snapshotIndicatesStarted(snapshot);
    const phase = snapshot.phase === "running" ? "paused" : snapshot.phase;
  const remainingAtAnchorSec =
    !hasStarted && phase === "idle" && snapshot.budgetSec > 0
      ? snapshot.budgetSec
      : snapshot.remainingSec;
    return {
      ...next,
      activeAgendaItemId: agendaItemId,
      phase,
      remainingAtAnchorSec,
      anchorMs: null,
      budgetSec: snapshot.budgetSec,
      temporaryDurationSec: snapshot.temporaryDurationSec,
      activeTopicHasStarted: hasStarted,
      chimedAt60ForTopicId: null,
      chimedAtZeroForTopicId: null,
    };
  }

  return applyPlannedBudgetToIdleTopic(next, agendaItemId, plannedDurationMin);
}

export function resolveAgendaBudgetSec(input: {
  plannedDurationMin: number | null | undefined;
  temporaryDurationMin?: number | null;
}): { budgetSec: number; temporaryDurationSec: number | null } | null {
  if (typeof input.temporaryDurationMin === "number" && input.temporaryDurationMin > 0) {
    const sec = Math.trunc(input.temporaryDurationMin) * 60;
    return { budgetSec: sec, temporaryDurationSec: sec };
  }
  if (typeof input.plannedDurationMin === "number" && input.plannedDurationMin > 0) {
    const sec = Math.trunc(input.plannedDurationMin) * 60;
    return { budgetSec: sec, temporaryDurationSec: null };
  }
  return null;
}

export function startAgendaTimer(
  state: MeetingAgendaTimerState,
  nowMs: number,
  budget: { budgetSec: number; temporaryDurationSec: number | null },
): MeetingAgendaTimerState {
  if (!state.activeAgendaItemId || !state.modeActive) return state;
  let next = state;
  if (state.phase === "running") {
    next = persistActiveTopic(state, nowMs);
  }
  const resumed = next.phase === "paused" && next.remainingAtAnchorSec > 0;
  const remainingAtAnchorSec = resumed ? next.remainingAtAnchorSec : budget.budgetSec;
  return {
    ...next,
    phase: "running",
    anchorMs: nowMs,
    remainingAtAnchorSec,
    budgetSec: budget.budgetSec,
    temporaryDurationSec: budget.temporaryDurationSec,
    activeTopicHasStarted: true,
    chimedAt60ForTopicId: resumed ? next.chimedAt60ForTopicId : null,
    chimedAtZeroForTopicId: resumed ? next.chimedAtZeroForTopicId : null,
  };
}

export function pauseAgendaTimer(state: MeetingAgendaTimerState, nowMs: number): MeetingAgendaTimerState {
  if (state.phase !== "running") return state;
  const remainingSec = deriveRemainingSec(state, nowMs);
  return {
    ...state,
    phase: "paused",
    anchorMs: null,
    remainingAtAnchorSec: remainingSec,
  };
}

export function resumeAgendaTimer(state: MeetingAgendaTimerState, nowMs: number): MeetingAgendaTimerState {
  if (state.phase !== "paused" || !state.modeActive) return state;
  return {
    ...state,
    phase: "running",
    anchorMs: nowMs,
  };
}

export function extendAgendaTimerOneMinute(
  state: MeetingAgendaTimerState,
  nowMs: number,
): MeetingAgendaTimerState {
  if (!state.modeActive) return state;
  let base = state;
  if (state.phase === "running") {
    const remaining = deriveRemainingSec(state, nowMs);
    base = {
      ...state,
      remainingAtAnchorSec: remaining,
      anchorMs: nowMs,
    };
  }
  return {
    ...base,
    remainingAtAnchorSec: base.remainingAtAnchorSec + 60,
    anchorMs: base.phase === "running" ? nowMs : base.anchorMs,
    chimedAt60ForTopicId:
      base.remainingAtAnchorSec + 60 > 60 ? null : base.chimedAt60ForTopicId,
  };
}

export function resetActiveAgendaTimer(state: MeetingAgendaTimerState): MeetingAgendaTimerState {
  if (!state.activeAgendaItemId) return state;
  const budget = state.budgetSec > 0 ? state.budgetSec : state.temporaryDurationSec ?? 0;
  const { [state.activeAgendaItemId]: _removed, ...rest } = state.topicSnapshots;
  return {
    ...state,
    phase: "idle",
    anchorMs: null,
    remainingAtAnchorSec: budget,
    activeTopicHasStarted: false,
    chimedAt60ForTopicId: null,
    chimedAtZeroForTopicId: null,
    topicSnapshots: rest,
  };
}

export function goToNextAgendaTopic(
  state: MeetingAgendaTimerState,
  orderedItemIds: string[],
  nowMs: number,
  plannedDurationById: Record<string, number | null | undefined>,
): MeetingAgendaTimerState {
  if (!state.activeAgendaItemId) return state;
  const idx = orderedItemIds.indexOf(state.activeAgendaItemId);
  if (idx < 0 || idx >= orderedItemIds.length - 1) return state;
  const withSnapshot =
    state.phase === "running" || state.phase === "paused"
      ? persistActiveTopic(state, nowMs)
      : state;
  const nextId = orderedItemIds[idx + 1]!;
  return selectAgendaTopic(withSnapshot, nextId, nowMs, plannedDurationById[nextId]);
}

export function setChimeEnabled(state: MeetingAgendaTimerState, enabled: boolean): MeetingAgendaTimerState {
  return { ...state, chimeEnabled: enabled };
}

export function markChimeMilestone(
  state: MeetingAgendaTimerState,
  milestone: "at60" | "atZero",
): MeetingAgendaTimerState {
  if (!state.activeAgendaItemId) return state;
  if (milestone === "at60") {
    return { ...state, chimedAt60ForTopicId: state.activeAgendaItemId };
  }
  return { ...state, chimedAtZeroForTopicId: state.activeAgendaItemId };
}

export function shouldChimeAt60(state: MeetingAgendaTimerState, remainingSec: number): boolean {
  if (
    !state.chimeEnabled ||
    !state.activeAgendaItemId ||
    state.phase !== "running" ||
    !state.activeTopicHasStarted
  ) {
    return false;
  }
  if (state.chimedAt60ForTopicId === state.activeAgendaItemId) return false;
  return remainingSec <= 60 && remainingSec > 0;
}

export function shouldChimeAtZero(state: MeetingAgendaTimerState, remainingSec: number): boolean {
  if (
    !state.chimeEnabled ||
    !state.activeAgendaItemId ||
    state.phase !== "running" ||
    !state.activeTopicHasStarted
  ) {
    return false;
  }
  if (state.chimedAtZeroForTopicId === state.activeAgendaItemId) return false;
  return remainingSec <= 0;
}

function pad2(n: number): string {
  return String(Math.abs(Math.trunc(n))).padStart(2, "0");
}

export function formatCountdownDisplay(remainingSec: number): string {
  const total = Math.abs(remainingSec);
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatOvertimeDisplay(overtimeSec: number): string {
  return `+${formatCountdownDisplay(overtimeSec)} überzogen`;
}

export function buildMeetingAgendaTimerPresentation(
  remainingSec: number,
  lifecycle: MeetingAgendaTimerLifecycle,
): MeetingAgendaTimerPresentation {
  if (lifecycle === "none") {
    return {
      kind: "normal",
      label: "Traktandum wählen",
      display: "—",
      remainingSec: Math.max(0, remainingSec),
    };
  }
  if (lifecycle === "ready") {
    const displaySec = Math.max(0, remainingSec);
    return {
      kind: "normal",
      label: "Geplante Zeit",
      display: displaySec > 0 ? formatCountdownDisplay(displaySec) : "—",
      remainingSec: displaySec,
    };
  }
  const effective = remainingSec;
  if (effective > 60) {
    return {
      kind: "normal",
      label: lifecycle === "paused" ? "Pausiert" : "Verbleibende Zeit",
      display: formatCountdownDisplay(effective),
      remainingSec: effective,
    };
  }
  if (effective > 0) {
    return {
      kind: "warning",
      label: "Letzte Minute",
      display: formatCountdownDisplay(effective),
      remainingSec: effective,
    };
  }
  if (effective === 0) {
    return {
      kind: "expired",
      label: "Geplante Zeit abgelaufen",
      display: "00:00",
      remainingSec: effective,
    };
  }
  return {
    kind: "overtime",
    label: "Überzogen",
    display: formatOvertimeDisplay(Math.abs(effective)),
    remainingSec: effective,
  };
}

export function sanitizeTimerStateForAgendaItems(
  state: MeetingAgendaTimerState,
  validAgendaItemIds: Set<string>,
): MeetingAgendaTimerState {
  if (!validAgendaItemIds.has(state.activeAgendaItemId ?? "")) {
    state = {
      ...state,
      activeAgendaItemId: null,
      phase: "idle",
      anchorMs: null,
      remainingAtAnchorSec: 0,
      budgetSec: 0,
      temporaryDurationSec: null,
      activeTopicHasStarted: false,
      chimedAt60ForTopicId: null,
      chimedAtZeroForTopicId: null,
    };
  }
  const topicSnapshots: Record<string, MeetingAgendaTopicTimerSnapshot> = {};
  for (const [id, snap] of Object.entries(state.topicSnapshots)) {
    if (validAgendaItemIds.has(id)) topicSnapshots[id] = snap;
  }
  return { ...state, topicSnapshots };
}

export function timerScopeMatches(state: MeetingAgendaTimerState, scope: MeetingAgendaTimerScope): boolean {
  return (
    state.scope.meetingId === scope.meetingId &&
    state.scope.tenantId === scope.tenantId &&
    state.scope.userId === scope.userId
  );
}