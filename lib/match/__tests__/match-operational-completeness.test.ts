import { describe, expect, it } from "vitest";
import {
  getMatchEndTimeCorrectionHref,
  getMatchOperationalCompleteness,
  matchRequiresEndTimeAction,
} from "@/lib/match/match-operational-completeness";

const START = "2026-08-10T14:00:00.000Z";

describe("matchRequiresEndTimeAction", () => {
  it("flags missing end", () => {
    expect(matchRequiresEndTimeAction({ startAt: START, endAt: null })).toBe(true);
    expect(matchRequiresEndTimeAction({ startAt: START })).toBe(true);
  });

  it("flags empty end representation", () => {
    expect(matchRequiresEndTimeAction({ startAt: START, endAt: "" })).toBe(true);
    expect(matchRequiresEndTimeAction({ startAt: START, endAt: "   " })).toBe(true);
  });

  it("flags start equal to end", () => {
    expect(matchRequiresEndTimeAction({ startAt: START, endAt: START })).toBe(true);
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
      true,
    );
  });

  it("builds planner edit correction href", () => {
    expect(getMatchEndTimeCorrectionHref("match-1")).toBe("/dashboard/planner/edit/match-1");
  });
});
