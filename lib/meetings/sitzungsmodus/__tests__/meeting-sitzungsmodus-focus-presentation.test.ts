import { describe, expect, it } from "vitest";
import { createMeetingAgendaTimerState } from "../meeting-agenda-timer-engine";
import {
  buildSitzungsmodusFocusTimerCaption,
  deriveSitzungsmodusTimerProgressRatio,
  pickDefaultSitzungsmodusAgendaItemId,
} from "../meeting-sitzungsmodus-focus-presentation";

const SCOPE = { meetingId: "m1", tenantId: "t1", userId: "u1" };

describe("meeting sitzungsmodus focus presentation", () => {
  it("picks first incomplete agenda item, else first item", () => {
    const items = [
      { id: "a1", status: "DISCUSSED" },
      { id: "a2", status: "OPEN" },
      { id: "a3", status: "OPEN" },
    ];
    expect(pickDefaultSitzungsmodusAgendaItemId(["a1", "a2", "a3"], items)).toBe("a2");
    expect(
      pickDefaultSitzungsmodusAgendaItemId(
        ["a1", "a2"],
        [
          { id: "a1", status: "DISCUSSED" },
          { id: "a2", status: "DISCUSSED" },
        ],
      ),
    ).toBe("a1");
    expect(pickDefaultSitzungsmodusAgendaItemId([], items)).toBeNull();
  });

  it("formats focus timer caption without duplicate planned copy", () => {
    expect(
      buildSitzungsmodusFocusTimerCaption({
        presentation: { kind: "normal", label: "Geplante Zeit", display: "05:00", remainingSec: 300 },
        lifecycle: "ready",
        plannedDurationMin: 5,
        topicCount: 3,
        hasActiveTopic: true,
      }),
    ).toBe("Geplante Dauer · 5 Min.");
    expect(
      buildSitzungsmodusFocusTimerCaption({
        presentation: { kind: "normal", label: "Verbleibende Zeit", display: "04:12", remainingSec: 252 },
        lifecycle: "running",
        plannedDurationMin: 5,
        topicCount: 3,
        hasActiveTopic: true,
      }),
    ).toBe("Verbleibende Zeit");
    expect(
      buildSitzungsmodusFocusTimerCaption({
        presentation: { kind: "overtime", label: "Überzogen", display: "+00:30", remainingSec: -30 },
        lifecycle: "expired",
        plannedDurationMin: 5,
        topicCount: 3,
        hasActiveTopic: true,
      }),
    ).toBe("Überzogen");
  });

  it("derives timer progress from remaining time and budget", () => {
    let state = createMeetingAgendaTimerState(SCOPE);
    state = { ...state, budgetSec: 600, remainingAtAnchorSec: 300, phase: "paused" };
    expect(deriveSitzungsmodusTimerProgressRatio(state, 300)).toBeCloseTo(0.5);
    expect(deriveSitzungsmodusTimerProgressRatio(state, 600)).toBe(0);
    expect(deriveSitzungsmodusTimerProgressRatio(state, 0)).toBe(1);
  });
});