import { describe, expect, it } from "vitest";
import { mapParticipationStatusToMatchAvailability } from "@/lib/match-squad/availability-adapter";

/**
 * 01B guard: availability response semantics must not imply release or cross-team visibility.
 * (No PlayerRelease schema exists in 01B — this test locks adapter behaviour only.)
 */
describe("01C boundary — availability adapter", () => {
  it("AVAILABLE + not selected does not map to any release signal", () => {
    const availability = mapParticipationStatusToMatchAvailability("YES");
    expect(availability).toBe("AVAILABLE");
    expect(availability).not.toBe("UNAVAILABLE");
  });

  it("OPEN/MAYBE remain operability UNKNOWN without selection side effects", () => {
    expect(mapParticipationStatusToMatchAvailability("OPEN")).toBe("UNKNOWN");
    expect(mapParticipationStatusToMatchAvailability("MAYBE")).toBe("UNKNOWN");
    expect(mapParticipationStatusToMatchAvailability(null)).toBe("UNKNOWN");
  });
});
