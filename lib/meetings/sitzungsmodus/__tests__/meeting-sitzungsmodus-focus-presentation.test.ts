import { describe, expect, it } from "vitest";
import { createMeetingAgendaTimerState } from "../meeting-agenda-timer-engine";
import { deriveSitzungsmodusTimerProgressRatio } from "../meeting-sitzungsmodus-focus-presentation";

const SCOPE = { meetingId: "m1", tenantId: "t1", userId: "u1" };

describe("meeting sitzungsmodus focus presentation", () => {
  it("derives timer progress from remaining time and budget", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = { ...state, budgetSec: 600, remainingAtAnchorSec: 300, phase: "paused" };
    expect(deriveSitzungsmodusTimerProgressRatio(state, 300)).toBeCloseTo(0.5);
    expect(deriveSitzungsmodusTimerProgressRatio(state, 600)).toBe(0);
    expect(deriveSitzungsmodusTimerProgressRatio(state, 0)).toBe(1);
  });
});