import { describe, expect, it } from "vitest";
import {
  canSelectForMatchSquad,
  hasMatchAvailabilityConflict,
  mapParticipationStatusToMatchAvailability,
} from "../availability-adapter";

describe("availability-adapter", () => {
  it("maps participation statuses to match availability domain", () => {
    expect(mapParticipationStatusToMatchAvailability(null)).toBe("UNKNOWN");
    expect(mapParticipationStatusToMatchAvailability("OPEN")).toBe("UNKNOWN");
    expect(mapParticipationStatusToMatchAvailability("YES")).toBe("AVAILABLE");
    expect(mapParticipationStatusToMatchAvailability("NO")).toBe("UNAVAILABLE");
    expect(mapParticipationStatusToMatchAvailability("MAYBE")).toBe("UNKNOWN");
  });

  it("derives conflict only for selected + unavailable", () => {
    expect(hasMatchAvailabilityConflict({ selected: false, availability: "UNAVAILABLE" })).toBe(
      false,
    );
    expect(hasMatchAvailabilityConflict({ selected: true, availability: "UNAVAILABLE" })).toBe(
      true,
    );
    expect(hasMatchAvailabilityConflict({ selected: true, availability: "AVAILABLE" })).toBe(
      false,
    );
  });

  it("blocks selection for unavailable roster players", () => {
    expect(
      canSelectForMatchSquad({
        rosterEligible: true,
        editable: true,
        availability: "UNAVAILABLE",
      }),
    ).toBe(false);
    expect(
      canSelectForMatchSquad({
        rosterEligible: true,
        editable: true,
        availability: "UNKNOWN",
      }),
    ).toBe(true);
  });
});
