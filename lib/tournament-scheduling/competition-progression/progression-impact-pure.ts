/**
 * SCE-TOURNAMENT-PLANNER-01J — downstream impact when upstream results change (pure).
 */

import type { ProgressionFixtureRow } from "./qualification-resolution-pure";

export type ProgressionImpactResult = {
  blocked: boolean;
  affectedDownstreamFixtureIds: readonly string[];
  completedDownstreamFixtureIds: readonly string[];
  message: string | null;
};

export function calculateProgressionImpact(input: {
  mutatedFixtureId: string;
  fixtures: readonly ProgressionFixtureRow[];
  qualificationSourceTypeById: ReadonlyMap<
    string,
    "GROUP_RANK" | "WINNER_OF_FIXTURE" | "LOSER_OF_FIXTURE"
  >;
  qualificationSourceFixtureIdById: ReadonlyMap<string, string | null>;
  qualificationSourceGroupIdById: ReadonlyMap<string, string | null>;
  completedFixtureIds: ReadonlySet<string>;
  mutatedFixtureGroupId: string | null;
}): ProgressionImpactResult {
  const affected = new Set<string>();

  function addWinnerChain(fromFixtureId: string) {
    for (const fixture of input.fixtures) {
      if (fixture.fixtureId === fromFixtureId) continue;
      for (const side of fixture.sides) {
        const qualId = side.qualificationSourceId;
        if (!qualId) continue;
        if (input.qualificationSourceTypeById.get(qualId) !== "WINNER_OF_FIXTURE") continue;
        const srcFix = input.qualificationSourceFixtureIdById.get(qualId);
        if (srcFix === fromFixtureId) {
          if (!affected.has(fixture.fixtureId)) {
            affected.add(fixture.fixtureId);
            addWinnerChain(fixture.fixtureId);
          }
        }
      }
    }
  }

  addWinnerChain(input.mutatedFixtureId);

  if (input.mutatedFixtureGroupId) {
    for (const fixture of input.fixtures) {
      for (const side of fixture.sides) {
        const qualId = side.qualificationSourceId;
        if (!qualId) continue;
        if (input.qualificationSourceTypeById.get(qualId) !== "GROUP_RANK") continue;
        const groupId = input.qualificationSourceGroupIdById.get(qualId);
        if (groupId === input.mutatedFixtureGroupId) {
          affected.add(fixture.fixtureId);
          addWinnerChain(fixture.fixtureId);
        }
      }
    }
  }

  affected.delete(input.mutatedFixtureId);

  const completedDownstream = [...affected].filter((id) =>
    input.completedFixtureIds.has(id),
  );

  if (completedDownstream.length > 0) {
    return {
      blocked: true,
      affectedDownstreamFixtureIds: [...affected],
      completedDownstreamFixtureIds: completedDownstream,
      message:
        "Changing this result would invalidate later completed match results. Clear or adjust downstream results first.",
    };
  }

  return {
    blocked: false,
    affectedDownstreamFixtureIds: [...affected],
    completedDownstreamFixtureIds: [],
    message: null,
  };
}
