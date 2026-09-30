import { describe, expect, it } from "vitest";
import {
  clubEventEffectiveEndAt,
  isClubEventRelevantForParticipationAttention,
} from "@/lib/events/domain-audience/club-event-relevance";

describe("club-event-relevance", () => {
  const due = new Date("2026-10-05T18:00:00.000Z");

  it("allows upcoming SCHEDULED club event with active request", () => {
    expect(
      isClubEventRelevantForParticipationAttention({
        type: "OTHER",
        status: "SCHEDULED",
        startAt: new Date("2026-10-10T18:00:00.000Z"),
        endAt: null,
        now: new Date("2026-10-01T12:00:00.000Z"),
        participationResponseDueAt: due,
      }),
    ).toBe(true);
  });

  it("excludes past events by effective end", () => {
    expect(
      isClubEventRelevantForParticipationAttention({
        type: "OTHER",
        status: "SCHEDULED",
        startAt: new Date("2026-09-01T10:00:00.000Z"),
        endAt: new Date("2026-09-01T12:00:00.000Z"),
        now: new Date("2026-10-01T12:00:00.000Z"),
        participationResponseDueAt: due,
      }),
    ).toBe(false);
  });

  it("excludes when participation request inactive", () => {
    expect(
      isClubEventRelevantForParticipationAttention({
        type: "OTHER",
        status: "SCHEDULED",
        startAt: new Date("2026-10-10T18:00:00.000Z"),
        endAt: null,
        now: new Date("2026-10-01T12:00:00.000Z"),
        participationResponseDueAt: null,
      }),
    ).toBe(false);
  });

  it("uses endAt when present for effective end", () => {
    const end = new Date("2026-10-12T22:00:00.000Z");
    expect(
      clubEventEffectiveEndAt({
        startAt: new Date("2026-10-10T18:00:00.000Z"),
        endAt: end,
      }),
    ).toEqual(end);
  });

  it("excludes CANCELLED and ARCHIVED statuses", () => {
    const base = {
      type: "OTHER" as const,
      startAt: new Date("2026-10-10T18:00:00.000Z"),
      endAt: null,
      now: new Date("2026-10-01T12:00:00.000Z"),
      participationResponseDueAt: due,
    };
    expect(
      isClubEventRelevantForParticipationAttention({ ...base, status: "CANCELLED" }),
    ).toBe(false);
    expect(
      isClubEventRelevantForParticipationAttention({ ...base, status: "ARCHIVED" }),
    ).toBe(false);
  });

  it("allows in-progress LIVE event before effective end", () => {
    expect(
      isClubEventRelevantForParticipationAttention({
        type: "OTHER",
        status: "LIVE",
        startAt: new Date("2026-10-01T10:00:00.000Z"),
        endAt: new Date("2026-10-01T22:00:00.000Z"),
        now: new Date("2026-10-01T12:00:00.000Z"),
        participationResponseDueAt: due,
      }),
    ).toBe(true);
  });

  it("excludes MATCH type events", () => {
    expect(
      isClubEventRelevantForParticipationAttention({
        type: "MATCH",
        status: "SCHEDULED",
        startAt: new Date("2026-10-10T18:00:00.000Z"),
        endAt: null,
        now: new Date("2026-10-01T12:00:00.000Z"),
        participationResponseDueAt: due,
      }),
    ).toBe(false);
  });
});
