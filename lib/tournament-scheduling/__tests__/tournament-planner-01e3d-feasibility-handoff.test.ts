/**
 * SCE-TOURNAMENT-PLANNER-01E3D — 01D structural handoff for GROUP_RANK sources.
 */

import { describe, expect, it } from "vitest";
import { resolveFixtureSidesForFeasibility } from "../competition-structure/unresolved-fixture-feasibility";

describe("01E3D — GROUP_RANK 01D handoff", () => {
  it("marks qualification sides unresolved for participant-rest feasibility", () => {
    const resolution = resolveFixtureSidesForFeasibility({
      sideAParticipantId: null,
      sideBParticipantId: null,
      sideSources: [
        { side: "A", sourceType: "QUALIFICATION_REFERENCE", participantId: null },
        { side: "B", sourceType: "QUALIFICATION_REFERENCE", participantId: null },
      ],
    });
    expect(resolution.hasUnresolvedSide).toBe(true);
    expect(resolution.sideAParticipantId).toBeNull();
    expect(resolution.sideBParticipantId).toBeNull();
  });
});
