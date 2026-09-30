import { describe, expect, it } from "vitest";
import { isTrainingSessionRelevantForParticipationAttention } from "@/lib/training/domain-audience/training-session-relevance";

describe("training-session-relevance", () => {
  const due = new Date("2026-10-06T18:00:00.000Z");
  const futureStart = new Date("2026-10-07T13:45:00.000Z");
  const nowBefore = new Date("2026-10-07T12:00:00.000Z");
  const nowAfter = new Date("2026-10-07T14:00:00.000Z");

  it("includes future scheduled session with active request", () => {
    expect(
      isTrainingSessionRelevantForParticipationAttention({
        status: "SCHEDULED",
        startAt: futureStart,
        overrideStartAt: null,
        now: nowBefore,
        participationResponseDueAt: due,
      }),
    ).toBe(true);
  });

  it("excludes session without active participation request", () => {
    expect(
      isTrainingSessionRelevantForParticipationAttention({
        status: "SCHEDULED",
        startAt: futureStart,
        now: nowBefore,
        participationResponseDueAt: null,
      }),
    ).toBe(false);
  });

  it("excludes cancelled session", () => {
    expect(
      isTrainingSessionRelevantForParticipationAttention({
        status: "CANCELLED",
        startAt: futureStart,
        now: nowBefore,
        participationResponseDueAt: due,
      }),
    ).toBe(false);
  });

  it("excludes completed (started) session", () => {
    expect(
      isTrainingSessionRelevantForParticipationAttention({
        status: "SCHEDULED",
        startAt: futureStart,
        now: nowAfter,
        participationResponseDueAt: due,
      }),
    ).toBe(false);
  });
});
