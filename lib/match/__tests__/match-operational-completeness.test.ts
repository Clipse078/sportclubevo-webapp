import { describe, expect, it } from "vitest";
import {
  getMatchEndTimeCorrectionHref,
  getMatchOperationalCompleteness,
  matchRequiresEndTimeAction,
} from "@/lib/match/match-operational-completeness";

const START = "2026-08-10T14:00:00.000Z";

describe("matchRequiresEndTimeAction", () => {
  it("does not flag missing end when policy can derive an interval", () => {
    expect(matchRequiresEndTimeAction({ startAt: START, endAt: null })).toBe(false);
    expect(matchRequiresEndTimeAction({ startAt: START })).toBe(false);
  });

  it("does not flag empty or equal provider end when policy can derive", () => {
    expect(matchRequiresEndTimeAction({ startAt: START, endAt: "" })).toBe(false);
    expect(matchRequiresEndTimeAction({ startAt: START, endAt: START })).toBe(false);
  });

  it("flags invalid start", () => {
    expect(matchRequiresEndTimeAction({ startAt: "invalid", endAt: null })).toBe(true);
  });

  it("accepts valid end after start", () => {
    expect(
      matchRequiresEndTimeAction({
        startAt: START,
        endAt: "2026-08-10T16:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("accepts overnight valid interval", () => {
    expect(
      matchRequiresEndTimeAction({
        startAt: "2026-08-10T22:00:00.000Z",
        endAt: "2026-08-11T01:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("derives completeness without persisted flags", () => {
    expect(getMatchOperationalCompleteness({ startAt: START, endAt: null }).requiresEndTime).toBe(
      false,
    );
  });

  it("builds planner edit correction href", () => {
    expect(getMatchEndTimeCorrectionHref("match-1")).toBe("/dashboard/planner/edit/match-1");
  });
});
