/**
 * Guided Sitzungsmodus entry (PR on #995) — summary actions, no lifecycle side effects.
 */

import type { MeetingAgendaTimerState } from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-types";

export const MEETING_GUIDED_SITZUNGSMODUS_EVENT = "meeting-guided-enter-sitzungsmodus" as const;

export type MeetingGuidedSitzungsmodusEventDetail = {
  /** Open Traktanden, expand focus shell, scroll below workspace chrome. */
  revealFocus?: boolean;
};

/** Session can be continued without restarting the mode shell. */
export function isSitzungsmodusResumable(state: MeetingAgendaTimerState): boolean {
  if (state.modeActive) return true;
  if (state.activeAgendaItemId) return true;
  return Object.keys(state.topicSnapshots).length > 0;
}

export function getSitzungsmodusSummaryActionLabel(state: MeetingAgendaTimerState): string {
  return isSitzungsmodusResumable(state) ? "Sitzungsmodus fortsetzen" : "Sitzungsmodus starten";
}

export function dispatchMeetingGuidedEnterSitzungsmodus(
  detail: MeetingGuidedSitzungsmodusEventDetail = { revealFocus: true },
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MEETING_GUIDED_SITZUNGSMODUS_EVENT, {
      detail,
    }),
  );
}