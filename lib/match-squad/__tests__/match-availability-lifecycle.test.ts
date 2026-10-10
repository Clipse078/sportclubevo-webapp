import { describe, expect, it } from "vitest";
import {
  canSendMatchAvailabilityReminder,
  isMatchCancelledForAvailability,
  matchAvailabilityReadOnlyReason,
} from "@/lib/match-squad/match-availability-lifecycle";

describe("match-availability-lifecycle", () => {
  const future = new Date(Date.now() + 86_400_000);

  it("blocks cancelled matches", () => {
    expect(isMatchCancelledForAvailability({ status: "CANCELLED" })).toBe(true);
    expect(
      matchAvailabilityReadOnlyReason({ status: "CANCELLED", startAt: future }),
    ).toMatch(/abgesagt/i);
  });

  it("requires active request for reminders", () => {
    expect(
      canSendMatchAvailabilityReminder({
        status: "SCHEDULED",
        startAt: future,
        participationResponseDueAt: null,
      }),
    ).toBe(false);
    expect(
      canSendMatchAvailabilityReminder({
        status: "SCHEDULED",
        startAt: future,
        participationResponseDueAt: new Date(Date.now() + 3_600_000),
      }),
    ).toBe(true);
  });
});
