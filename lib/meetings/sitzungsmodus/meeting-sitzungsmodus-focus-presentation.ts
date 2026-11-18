import type {
  MeetingAgendaTimerLifecycle,
  MeetingAgendaTimerPresentation,
  MeetingAgendaTimerScope,
  MeetingAgendaTimerState,
} from "./meeting-agenda-timer-types";

const FOCUS_STORAGE_PREFIX = "sce-meeting-sitzungsmodus-focus";
export const MEETING_SITZUNGSMODUS_FOCUS_DOM_ATTR = "data-meeting-sitzungsmodus-focus" as const;

export function buildMeetingSitzungsmodusFocusStorageKey(scope: MeetingAgendaTimerScope): string {
  return `${FOCUS_STORAGE_PREFIX}:${scope.userId}:${scope.tenantId}:${scope.meetingId}`;
}

function getSessionStorage(): Storage | null {
  if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
  const globalStorage = (globalThis as { sessionStorage?: Storage }).sessionStorage;
  return globalStorage ?? null;
}

export function loadMeetingSitzungsmodusFocusPresentation(scope: MeetingAgendaTimerScope): boolean {
  const storage = getSessionStorage();
  if (!storage) return false;
  try {
    return storage.getItem(buildMeetingSitzungsmodusFocusStorageKey(scope)) === "1";
  } catch {
    return false;
  }
}

export function saveMeetingSitzungsmodusFocusPresentation(scope: MeetingAgendaTimerScope, active: boolean): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    const key = buildMeetingSitzungsmodusFocusStorageKey(scope);
    if (active) storage.setItem(key, "1");
    else storage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearMeetingSitzungsmodusFocusPresentation(scope: MeetingAgendaTimerScope): void {
  saveMeetingSitzungsmodusFocusPresentation(scope, false);
}

/** Progress 0–1 for the active topic timer (includes extensions). */
export function deriveSitzungsmodusTimerProgressRatio(
  state: MeetingAgendaTimerState,
  remainingSec: number,
): number {
  if (state.budgetSec <= 0) return 0;
  const budget = state.budgetSec;
  const consumed = budget - remainingSec;
  if (consumed <= 0) return 0;
  if (consumed >= budget) return 1;
  return consumed / budget;
}

export function formatAgendaDurationMinLabel(durationMin: number | null | undefined): string {
  if (typeof durationMin === "number" && durationMin > 0) return `${durationMin} Min.`;
  return "—";
}

type AgendaItemPickInput = { id: string; status: string };

/** First OPEN item in display order, otherwise first item. */
export function pickDefaultSitzungsmodusAgendaItemId(
  orderedItemIds: readonly string[],
  agendaItems: readonly AgendaItemPickInput[],
): string | null {
  if (orderedItemIds.length === 0) return null;
  const byId = new Map(agendaItems.map((item) => [item.id, item]));
  const firstOpen = orderedItemIds.find((id) => byId.get(id)?.status !== "DISCUSSED");
  return firstOpen ?? orderedItemIds[0] ?? null;
}

export function buildSitzungsmodusFocusTimerCaption(input: {
  presentation: MeetingAgendaTimerPresentation;
  lifecycle: MeetingAgendaTimerLifecycle;
  plannedDurationMin: number | null;
  topicCount: number;
  hasActiveTopic: boolean;
}): string | null {
  if (input.topicCount === 0) return "Keine Traktanden";
  if (!input.hasActiveTopic) return null;
  if (input.lifecycle === "ready" && input.plannedDurationMin) {
    return `Geplante Dauer · ${input.plannedDurationMin} Min.`;
  }
  if (input.presentation.kind === "overtime") {
    return input.presentation.label;
  }
  return input.presentation.label;
}