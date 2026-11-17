import { describe, expect, it } from "vitest";
import {
  chimeMilestoneSecondFromCue,
  collectDueChimeCues,
  remainingSecDisplayFloor,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-chime-scheduler";
import {
  createMeetingAgendaTimerState,
  markChimeMilestone,
  pauseAgendaTimer,
  resolveAgendaBudgetSec,
  selectAgendaTopic,
  setChimeEnabled,
  startAgendaTimer,
  startSitzungsmodus,
} from "@/lib/meetings/sitzungsmodus/meeting-agenda-timer-engine";

const SCOPE = { meetingId: "m1", tenantId: "t1", userId: "u1" };

function runningAtTenSeconds() {
  let state = createMeetingAgendaTimerState(SCOPE);
  state = startSitzungsmodus(state);
  state = setChimeEnabled(state, true);
  state = selectAgendaTopic(state, "a1", 0, 1);
  state = startAgendaTimer(state, 0, resolveAgendaBudgetSec({ plannedDurationMin: 1 })!);
  return state;
}

describe("meeting agenda timer chime scheduler", () => {
  it("plays full 10→0 sequence with boundary tracking", () => {
    let state = runningAtTenSeconds();
    let observed: number | null = null;
    const heard: number[] = [];

    for (let sec = 12; sec >= -0.5; sec -= 0.45) {
      const { cues, nextObservedFloorSec } = collectDueChimeCues(state, sec, observed);
      observed = nextObservedFloorSec;
      for (const cue of cues) {
        const milestone = chimeMilestoneSecondFromCue(cue);
        heard.push(milestone);
        state = markChimeMilestone(state, milestone);
      }
    }

    expect(heard).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    expect(cuesKind(heard)).toMatchObject({ countdown: 10, completion: 1 });
  });

  it("uses fractional remaining without requiring exact integer callbacks", () => {
    let state = runningAtTenSeconds();
    expect(collectDueChimeCues(state, 10.95, null).cues[0]).toEqual({ kind: "countdown", second: 10 });
    state = markChimeMilestone(state, 10);
    expect(collectDueChimeCues(state, 10.05, 10).cues).toEqual([]);
    expect(collectDueChimeCues(state, 9.92, 10).cues[0]).toEqual({ kind: "countdown", second: 9 });
  });

  it("deduplicates duplicate renders on the same floor", () => {
    let state = runningAtTenSeconds();
    state = markChimeMilestone(state, 10);
    expect(collectDueChimeCues(state, 10.4, 10).cues).toEqual([]);
  });

  it("does not burst missed seconds after a background gap", () => {
    let state = runningAtTenSeconds();
    let observed: number | null = 11;
    const { cues, nextObservedFloorSec } = collectDueChimeCues(state, 3.6, observed);
    expect(cues.map(chimeMilestoneSecondFromCue)).toEqual([3]);
    expect(nextObservedFloorSec).toBe(3);
  });

  it("honours pause guard via engine phase", () => {
    let state = runningAtTenSeconds();
    state = pauseAgendaTimer(state, 0);
    expect(collectDueChimeCues(state, 0, 0).cues).toEqual([]);
  });

  it("rearms after +1 minute leaves finishing zone", () => {
    let state = runningAtTenSeconds();
    state = markChimeMilestone(state, 10);
    state = markChimeMilestone(state, 9);
    state = {
      ...state,
      chimedMilestonesByTopicId: { a1: [] },
      remainingAtAnchorSec: 72,
      phase: "running",
      anchorMs: 0,
    };
    const afterExtend = collectDueChimeCues(state, 72, 9);
    expect(afterExtend.cues).toEqual([]);
    const reentry = collectDueChimeCues(state, 10.2, 72);
    expect(reentry.cues[0]).toEqual({ kind: "countdown", second: 10 });
  });

  it("resume does not replay cues above the resumed floor", () => {
    let state = runningAtTenSeconds();
    state = markChimeMilestone(state, 10);
    state = markChimeMilestone(state, 9);
    state = pauseAgendaTimer(state, 0);
    state = { ...state, phase: "running", remainingAtAnchorSec: 8.5, anchorMs: 0 };
    expect(collectDueChimeCues(state, 8.5, 8).cues[0]).toEqual({ kind: "countdown", second: 8 });
    state = markChimeMilestone(state, 8);
    expect(collectDueChimeCues(state, 8.1, 8).cues).toEqual([]);
    expect(collectDueChimeCues(state, 7.9, 8).cues[0]).toEqual({ kind: "countdown", second: 7 });
  });

  it("respects mute (chime disabled)", () => {
    let state = runningAtTenSeconds();
    state = setChimeEnabled(state, false);
    expect(collectDueChimeCues(state, 10, null).cues).toEqual([]);
  });

  it("maps completion cue distinctly from countdown", () => {
    const state = runningAtTenSeconds();
    const atZero = collectDueChimeCues(state, 0, 1);
    expect(atZero.cues).toEqual([{ kind: "completion" }]);
    expect(chimeMilestoneSecondFromCue(atZero.cues[0]!)).toBe(0);
  });

  it("computes display floors for negative remaining", () => {
    expect(remainingSecDisplayFloor(-2.3)).toBe(0);
    expect(remainingSecDisplayFloor(0.4)).toBe(0);
    expect(remainingSecDisplayFloor(10.99)).toBe(10);
  });
});

function cuesKind(heard: number[]) {
  return {
    countdown: heard.filter((s) => s > 0).length,
    completion: heard.filter((s) => s === 0).length,
  };
}