import type { MeetingAgendaTimerState } from "./meeting-agenda-timer-types";
import {
  MEETING_AGENDA_TIMER_CHIME_SECONDS,
  MEETING_AGENDA_TIMER_COMPLETION_SECOND,
} from "./meeting-agenda-timer-types";

export type MeetingAgendaTimerChimeCue =
  | { kind: "countdown"; second: number }
  | { kind: "completion" };

const FINISHING_UPPER_SEC = 10;

export function remainingSecDisplayFloor(remainingSec: number): number {
  if (remainingSec <= 0) return 0;
  return Math.floor(remainingSec);
}

export function isFinishingCountdownFloor(floorSec: number): boolean {
  return floorSec >= MEETING_AGENDA_TIMER_COMPLETION_SECOND && floorSec <= FINISHING_UPPER_SEC;
}

function chimeGuardsPass(state: MeetingAgendaTimerState): boolean {
  return Boolean(
    state.chimeEnabled &&
      state.activeAgendaItemId &&
      state.phase === "running" &&
      state.activeTopicHasStarted,
  );
}

function playedForActiveTopic(state: MeetingAgendaTimerState): number[] {
  if (!state.activeAgendaItemId) return [];
  return state.chimedMilestonesByTopicId[state.activeAgendaItemId] ?? [];
}

/**
 * Returns at most one cue per scheduler tick. Crosses second boundaries using display
 * floors; large negative jumps emit only the landing second (no catch-up bursts).
 */
export function collectDueChimeCues(
  state: MeetingAgendaTimerState,
  remainingSec: number,
  lastObservedFloorSec: number | null,
): { cues: MeetingAgendaTimerChimeCue[]; nextObservedFloorSec: number } {
  const floor = remainingSecDisplayFloor(remainingSec);

  if (!chimeGuardsPass(state)) {
    return { cues: [], nextObservedFloorSec: floor };
  }

  if (floor > FINISHING_UPPER_SEC) {
    return { cues: [], nextObservedFloorSec: floor };
  }

  const played = playedForActiveTopic(state);
  const dueSecond = resolveDueFinishingSecond(floor, lastObservedFloorSec, played);

  if (dueSecond == null) {
    return { cues: [], nextObservedFloorSec: floor };
  }

  const cues: MeetingAgendaTimerChimeCue[] =
    dueSecond === MEETING_AGENDA_TIMER_COMPLETION_SECOND
      ? [{ kind: "completion" }]
      : [{ kind: "countdown", second: dueSecond }];

  return { cues, nextObservedFloorSec: floor };
}

function resolveDueFinishingSecond(
  floor: number,
  lastObserved: number | null,
  played: number[],
): number | null {
  if (!isFinishingCountdownFloor(floor)) return null;
  if (!MEETING_AGENDA_TIMER_CHIME_SECONDS.includes(floor as (typeof MEETING_AGENDA_TIMER_CHIME_SECONDS)[number])) {
    return null;
  }
  if (played.includes(floor)) return null;

  if (lastObserved === null) {
    return floor;
  }

  if (floor > lastObserved) {
    return null;
  }

  if (floor < lastObserved) {
    return floor;
  }

  return floor;
}

export function chimeMilestoneSecondFromCue(cue: MeetingAgendaTimerChimeCue): number {
  return cue.kind === "completion" ? MEETING_AGENDA_TIMER_COMPLETION_SECOND : cue.second;
}