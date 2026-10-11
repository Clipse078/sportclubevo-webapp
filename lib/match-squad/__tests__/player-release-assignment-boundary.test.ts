import { describe, expect, it } from "vitest";
import { PLAYER_RELEASE_ASSIGNMENT_SIGNAL_BOUNDARIES } from "@/lib/match-squad/player-release-assignment-service";
import { PLAYER_RELEASE_REQUEST_SIGNAL_BOUNDARIES } from "@/lib/match-squad/player-release-request-service";

describe("MATCH_SQUAD_PLAYER_AVAILABILITY-01E signal boundaries", () => {
  it("keeps approval separate from assignment", () => {
    expect(PLAYER_RELEASE_REQUEST_SIGNAL_BOUNDARIES.approvalDoesNotAssignToMatchSquad).toBe(true);
    expect(PLAYER_RELEASE_ASSIGNMENT_SIGNAL_BOUNDARIES.approvalDoesNotAssignToMatchSquad).toBe(
      true,
    );
    expect(PLAYER_RELEASE_ASSIGNMENT_SIGNAL_BOUNDARIES.assignmentRequiresApprovedRequest).toBe(
      true,
    );
    expect(
      PLAYER_RELEASE_ASSIGNMENT_SIGNAL_BOUNDARIES.assignmentDoesNotCreateStructuralKaderMembership,
    ).toBe(true);
  });
});
