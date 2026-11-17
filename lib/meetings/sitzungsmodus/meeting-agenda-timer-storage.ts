import {
  createMeetingAgendaTimerState,
  sanitizeTimerStateForAgendaItems,
  timerScopeMatches,
} from "./meeting-agenda-timer-engine";
import {
  MEETING_AGENDA_TIMER_STORAGE_VERSION,
  type MeetingAgendaTimerScope,
  type MeetingAgendaTimerState,
} from "./meeting-agenda-timer-types";

const STORAGE_PREFIX = "sce-meeting-agenda-timer";

export function buildMeetingAgendaTimerStorageKey(scope: MeetingAgendaTimerScope): string {
  return `${STORAGE_PREFIX}:${scope.userId}:${scope.tenantId}:${scope.meetingId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseMeetingAgendaTimerState(raw: unknown): MeetingAgendaTimerState | null {
  if (!isRecord(raw)) return null;
  const version = raw.v;
  if (version !== 1 && version !== MEETING_AGENDA_TIMER_STORAGE_VERSION) return null;
  if (!isRecord(raw.scope)) return null;
  const scope = raw.scope;
  if (
    typeof scope.meetingId !== "string" ||
    typeof scope.tenantId !== "string" ||
    typeof scope.userId !== "string"
  ) {
    return null;
  }
  const state = raw as unknown as MeetingAgendaTimerState;
  if (typeof state.activeTopicHasStarted !== "boolean") {
    state.activeTopicHasStarted =
      state.phase === "running" ||
      (state.phase === "paused" && state.remainingAtAnchorSec < state.budgetSec);
  }
  if (!state.chimedMilestonesByTopicId || typeof state.chimedMilestonesByTopicId !== "object") {
    state.chimedMilestonesByTopicId = {};
    const legacy60 = state.chimedAt60ForTopicId;
    const legacyZero = state.chimedAtZeroForTopicId;
    if (legacy60) {
      const arr = state.chimedMilestonesByTopicId[legacy60] ?? [];
      state.chimedMilestonesByTopicId[legacy60] = [...new Set([...arr, 60])];
    }
    if (legacyZero) {
      const arr = state.chimedMilestonesByTopicId[legacyZero] ?? [];
      state.chimedMilestonesByTopicId[legacyZero] = [...new Set([...arr, 0])];
    }
  }
  if (state.v !== MEETING_AGENDA_TIMER_STORAGE_VERSION) {
    state.v = MEETING_AGENDA_TIMER_STORAGE_VERSION;
  }
  return state;
}

function getSessionStorage(): Storage | null {
  if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
  const globalStorage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
  return globalStorage ?? null;
}

export function loadMeetingAgendaTimerState(
  scope: MeetingAgendaTimerScope,
  validAgendaItemIds: Set<string>,
): MeetingAgendaTimerState {
  const storage = getSessionStorage();
  if (!storage) return createMeetingAgendaTimerState(scope);
  try {
    const key = buildMeetingAgendaTimerStorageKey(scope);
    const raw = storage.getItem(key);
    if (!raw) return createMeetingAgendaTimerState(scope);
    const parsed = parseMeetingAgendaTimerState(JSON.parse(raw) as unknown);
    if (!parsed || !timerScopeMatches(parsed, scope)) {
      storage.removeItem(key);
      return createMeetingAgendaTimerState(scope);
    }
    return sanitizeTimerStateForAgendaItems(parsed, validAgendaItemIds);
  } catch {
    return createMeetingAgendaTimerState(scope);
  }
}

export function saveMeetingAgendaTimerState(state: MeetingAgendaTimerState): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    const key = buildMeetingAgendaTimerStorageKey(state.scope);
    storage.setItem(key, JSON.stringify(state));
  } catch {
    // Quota or privacy mode — timer continues in memory only.
  }
}

export function clearMeetingAgendaTimerState(scope: MeetingAgendaTimerScope): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(buildMeetingAgendaTimerStorageKey(scope));
  } catch {
    // ignore
  }
}