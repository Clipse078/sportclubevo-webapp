import { describe, expect, it } from "vitest";
import {
  computeTargetMetricProgress,
  filterActiveInitiatives,
  filterRelevantTargets,
  filterUpcomingMeetings,
} from "../overview-helpers";

describe("club-development overview helpers", () => {
  it("filters active targets only", () => {
    const targets = [
      { id: "1", status: "ACTIVE" },
      { id: "2", status: "ARCHIVED" },
    ] as Parameters<typeof filterRelevantTargets>[0];
    expect(filterRelevantTargets(targets).map((t) => t.id)).toEqual(["1"]);
  });

  it("filters active initiatives", () => {
    const initiatives = [
      { id: "a", status: "IN_PROGRESS" },
      { id: "b", status: "COMPLETED" },
    ] as Parameters<typeof filterActiveInitiatives>[0];
    expect(filterActiveInitiatives(initiatives).map((i) => i.id)).toEqual(["a"]);
  });

  it("orders upcoming planned meetings", () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const meetings = [
      {
        id: "m2",
        status: "PLANNED",
        meetingDate: new Date("2026-06-15T10:00:00.000Z"),
      },
      {
        id: "m1",
        status: "PLANNED",
        meetingDate: new Date("2026-06-10T10:00:00.000Z"),
      },
      {
        id: "m3",
        status: "COMPLETED",
        meetingDate: new Date("2026-06-20T10:00:00.000Z"),
      },
    ] as Parameters<typeof filterUpcomingMeetings>[0];
    expect(
      filterUpcomingMeetings(meetings, now).map((m) => m.id),
    ).toEqual(["m1", "m2"]);
  });

  it("computes metric progress without inventing when no metrics", () => {
    expect(computeTargetMetricProgress([])).toBeNull();
    const pct = computeTargetMetricProgress([
      {
        id: "x",
        label: "K",
        type: "NUMERIC",
        direction: "INCREASE",
        targetValue: 100,
        currentValue: 50,
        unit: null,
        sortOrder: 0,
      },
    ]);
    expect(pct).toBe(50);
  });
});
