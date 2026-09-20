import { describe, expect, it } from "vitest";
import { shouldEmitSeriesAssignmentNotification } from "../recurrence-assignment";

describe("series assignment storm protection", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  it("allows immediate/near-term generated occurrences", () => {
    const dueAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    expect(shouldEmitSeriesAssignmentNotification(dueAt, now)).toBe(true);
  });

  it("suppresses far-future generated occurrences", () => {
    const dueAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(shouldEmitSeriesAssignmentNotification(dueAt, now)).toBe(false);
  });

  it("allows missing dueAt", () => {
    expect(shouldEmitSeriesAssignmentNotification(null, now)).toBe(true);
  });
});
