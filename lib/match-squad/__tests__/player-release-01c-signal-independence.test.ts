import { describe, expect, it } from "vitest";
import { mapParticipationStatusToMatchAvailability } from "@/lib/match-squad/availability-adapter";
import { PLAYER_RELEASE_SIGNAL_BOUNDARIES } from "@/lib/match-squad/player-release-service";

describe("01C signal independence", () => {
  it("AVAILABLE does not imply RELEASED", () => {
    expect(mapParticipationStatusToMatchAvailability("YES")).toBe("AVAILABLE");
    expect(PLAYER_RELEASE_SIGNAL_BOUNDARIES.availabilityDoesNotCreateOrRevokeRelease).toBe(true);
  });

  it("NOT SELECTED is not modeled as release", () => {
    expect(PLAYER_RELEASE_SIGNAL_BOUNDARIES.matchSquadSelectionDoesNotBlockRelease).toBe(true);
  });

  it("release service does not mutate availability or match squad", () => {
    expect(PLAYER_RELEASE_SIGNAL_BOUNDARIES.doesNotMutateParticipationResponse).toBe(true);
    expect(PLAYER_RELEASE_SIGNAL_BOUNDARIES.doesNotMutateMatchSquadMember).toBe(true);
  });
});
