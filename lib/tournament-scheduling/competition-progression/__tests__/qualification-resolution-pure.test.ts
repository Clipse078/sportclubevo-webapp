/**
 * SCE-TOURNAMENT-PLANNER-01J — qualification resolution pure tests.
 */

import { describe, expect, it } from "vitest";
import {
  computeQualificationSideResolutions,
  type ProgressionFixtureRow,
  type QualificationSourceRef,
} from "../qualification-resolution-pure";

const RANKING = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"] as const,
};

function qual(id: string, partial: Partial<QualificationSourceRef>): QualificationSourceRef {
  return {
    id,
    sourceType: "GROUP_RANK",
    sourceGroupId: null,
    rank: null,
    sourceFixtureId: null,
    ...partial,
  };
}

describe("01J qualification resolution", () => {
  const groupA = "group-a";
  const sources = new Map<string, QualificationSourceRef>([
    ["qs-1a", qual("qs-1a", { sourceType: "GROUP_RANK", sourceGroupId: groupA, rank: 1 })],
    ["qs-wsf1", qual("qs-wsf1", { sourceType: "WINNER_OF_FIXTURE", sourceFixtureId: "sf1" })],
  ]);

  const groupFixtures: ProgressionFixtureRow[] = [
    {
      fixtureId: "gf1",
      tournamentGroupId: groupA,
      phaseType: "GROUP_MIX",
      sideAParticipantId: "p1",
      sideBParticipantId: "p2",
      sides: [],
    },
    {
      fixtureId: "gf2",
      tournamentGroupId: groupA,
      phaseType: "GROUP_MIX",
      sideAParticipantId: "p1",
      sideBParticipantId: "p3",
      sides: [],
    },
    {
      fixtureId: "gf3",
      tournamentGroupId: groupA,
      phaseType: "GROUP_MIX",
      sideAParticipantId: "p2",
      sideBParticipantId: "p3",
      sides: [],
    },
  ];

  const koFixtures: ProgressionFixtureRow[] = [
    {
      fixtureId: "sf1",
      tournamentGroupId: null,
      phaseType: "KNOCKOUT",
      sideAParticipantId: "p1",
      sideBParticipantId: "p2",
      sides: [],
    },
    {
      fixtureId: "final",
      tournamentGroupId: null,
      phaseType: "KNOCKOUT",
      sideAParticipantId: null,
      sideBParticipantId: null,
      sides: [
        {
          fixtureId: "final",
          side: "A",
          sourceType: "QUALIFICATION_REFERENCE",
          participantId: null,
          qualificationSourceId: "qs-wsf1",
        },
        {
          fixtureId: "final",
          side: "B",
          sourceType: "CONCRETE_PARTICIPANT",
          participantId: "p9",
          qualificationSourceId: null,
        },
      ],
    },
  ];

  it("A. GROUP_RANK resolves when rank is established", () => {
    const outcomes = new Map([
      [
        "gf1",
        {
          fixtureId: "gf1",
          state: "COMPLETED" as const,
          sideAParticipantId: "p1",
          sideBParticipantId: "p2",
          scoreSideA: 2,
          scoreSideB: 0,
          winnerParticipantId: "p1",
        },
      ],
      [
        "gf2",
        {
          fixtureId: "gf2",
          state: "COMPLETED" as const,
          sideAParticipantId: "p1",
          sideBParticipantId: "p3",
          scoreSideA: 1,
          scoreSideB: 1,
          winnerParticipantId: null,
        },
      ],
      [
        "gf3",
        {
          fixtureId: "gf3",
          state: "COMPLETED" as const,
          sideAParticipantId: "p2",
          sideBParticipantId: "p3",
          scoreSideA: 0,
          scoreSideB: 1,
          winnerParticipantId: "p3",
        },
      ],
    ]);

    const koSemi: ProgressionFixtureRow = {
      fixtureId: "semi",
      tournamentGroupId: null,
      phaseType: "KNOCKOUT",
      sideAParticipantId: null,
      sideBParticipantId: null,
      sides: [
        {
          fixtureId: "semi",
          side: "A",
          sourceType: "QUALIFICATION_REFERENCE",
          participantId: null,
          qualificationSourceId: "qs-1a",
        },
        {
          fixtureId: "semi",
          side: "B",
          sourceType: "CONCRETE_PARTICIPANT",
          participantId: "p9",
          qualificationSourceId: null,
        },
      ],
    };

    const updates = computeQualificationSideResolutions({
      fixtures: [...groupFixtures, koSemi],
      qualificationSourcesById: sources,
      groupMemberships: [{ tournamentGroupId: groupA, participantIds: ["p1", "p2", "p3"] }],
      groupResults: new Map([
        [
          groupA,
          [
            {
              fixtureId: "gf1",
              sideAParticipantId: "p1",
              sideBParticipantId: "p2",
              scoreSideA: 2,
              scoreSideB: 0,
            },
            {
              fixtureId: "gf2",
              sideAParticipantId: "p1",
              sideBParticipantId: "p3",
              scoreSideA: 1,
              scoreSideB: 1,
            },
            {
              fixtureId: "gf3",
              sideAParticipantId: "p2",
              sideBParticipantId: "p3",
              scoreSideA: 0,
              scoreSideB: 1,
            },
          ],
        ],
      ]),
      rankingConfiguration: RANKING,
      outcomesByFixtureId: outcomes,
    });

    const semiA = updates.find((u) => u.fixtureId === "semi" && u.side === "A");
    expect(semiA?.participantId).toBe("p1");
  });

  it("B. unresolved rank stays unresolved when tied", () => {
    const updates = computeQualificationSideResolutions({
      fixtures: [
        {
          fixtureId: "semi",
          tournamentGroupId: null,
          phaseType: "KNOCKOUT",
          sideAParticipantId: null,
          sideBParticipantId: null,
          sides: [
            {
              fixtureId: "semi",
              side: "A",
              sourceType: "QUALIFICATION_REFERENCE",
              participantId: null,
              qualificationSourceId: "qs-1a",
            },
            {
              fixtureId: "semi",
              side: "B",
              sourceType: "CONCRETE_PARTICIPANT",
              participantId: "p9",
              qualificationSourceId: null,
            },
          ],
        },
      ],
      qualificationSourcesById: sources,
      groupMemberships: [{ tournamentGroupId: groupA, participantIds: ["p1", "p2"] }],
      groupResults: new Map([
        [
          groupA,
          [
            {
              fixtureId: "gf1",
              sideAParticipantId: "p1",
              sideBParticipantId: "p2",
              scoreSideA: 1,
              scoreSideB: 1,
            },
          ],
        ],
      ]),
      rankingConfiguration: RANKING,
      outcomesByFixtureId: new Map([
        [
          "gf1",
          {
            fixtureId: "gf1",
            state: "COMPLETED",
            sideAParticipantId: "p1",
            sideBParticipantId: "p2",
            scoreSideA: 1,
            scoreSideB: 1,
            winnerParticipantId: null,
          },
        ],
      ]),
    });
    expect(updates[0]?.participantId).toBeNull();
  });

  it("E. KO winner resolves WINNER_OF_FIXTURE", () => {
    const updates = computeQualificationSideResolutions({
      fixtures: koFixtures,
      qualificationSourcesById: sources,
      groupMemberships: [],
      groupResults: new Map(),
      rankingConfiguration: RANKING,
      outcomesByFixtureId: new Map([
        [
          "sf1",
          {
            fixtureId: "sf1",
            state: "COMPLETED",
            sideAParticipantId: "p1",
            sideBParticipantId: "p2",
            scoreSideA: 2,
            scoreSideB: 1,
            winnerParticipantId: "p1",
          },
        ],
      ]),
    });
    const finalA = updates.find((u) => u.fixtureId === "final" && u.side === "A");
    expect(finalA?.participantId).toBe("p1");
  });
});
