import { describe, expect, it } from "vitest";
import {
  PLAYER_RELEASE_REQUEST_SIGNAL_BOUNDARIES,
} from "@/lib/match-squad/player-release-request-service";
import { PLAYER_RELEASE_SIGNAL_BOUNDARIES } from "@/lib/match-squad/player-release-service";

describe("MATCH_SQUAD_PLAYER_AVAILABILITY-01D signal boundaries", () => {
  it("documents approval does not assign and rejection does not mutate release", () => {
    expect(PLAYER_RELEASE_REQUEST_SIGNAL_BOUNDARIES.approvalDoesNotAssignToMatchSquad).toBe(true);
    expect(PLAYER_RELEASE_REQUEST_SIGNAL_BOUNDARIES.rejectionDoesNotMutatePlayerRelease).toBe(true);
    expect(PLAYER_RELEASE_REQUEST_SIGNAL_BOUNDARIES.requestDoesNotMutateParticipationResponse).toBe(true);
  });

  it("preserves 01C release boundaries", () => {
    expect(PLAYER_RELEASE_SIGNAL_BOUNDARIES.doesNotMutateMatchSquadMember).toBe(true);
    expect(PLAYER_RELEASE_SIGNAL_BOUNDARIES.doesNotMutateParticipationResponse).toBe(true);
  });
});
