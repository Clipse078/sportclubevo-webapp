/**
 * SCE-TOURNAMENT-PLANNER-01E3A — unresolved fixture feasibility contract.
 */

import { describe, expect, it } from "vitest";
import {
  UNRESOLVED_FIXTURE_PARTICIPANT_REST_FEASIBILITY,
  UNRESOLVED_FIXTURE_STRUCTURAL_FEASIBILITY,
  resolveFixtureSidesForFeasibility,
} from "../competition-structure";

describe("01E3A unresolved fixture feasibility contract", () => {
  it("records conservative structural vs participant-rest semantics", () => {
    expect(UNRESOLVED_FIXTURE_STRUCTURAL_FEASIBILITY).toBe(
      "ASSESSABLE_WHEN_FIXTURE_COUNT_AND_DURATION_KNOWN",
    );
    expect(UNRESOLVED_FIXTURE_PARTICIPANT_REST_FEASIBILITY).toBe(
      "NOT_RESOLVED_UNTIL_CONCRETE_PARTICIPANTS_KNOWN",
    );
  });

  it("marks qualification sides as unresolved for rest", () => {
    const resolved = resolveFixtureSidesForFeasibility({
      sideAParticipantId: "p1",
      sideBParticipantId: null,
      sideSources: [
        { side: "A", sourceType: "CONCRETE_PARTICIPANT", participantId: "p1" },
        { side: "B", sourceType: "QUALIFICATION_REFERENCE", participantId: null },
      ],
    });
    expect(resolved.hasUnresolvedSide).toBe(true);
    expect(resolved.sideBParticipantId).toBeNull();
  });
});
