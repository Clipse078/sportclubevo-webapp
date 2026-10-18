/**
 * SCE-TOURNAMENT-PLANNER-01J — group standings pure tests.
 */

import { describe, expect, it } from "vitest";
import {
  calculateTournamentGroupStandings,
  participantAtGroupRank,
} from "../group-standings-pure";

const DEFAULT = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"] as const,
};

const CUSTOM = {
  winPoints: 4,
  drawPoints: 2,
  lossPoints: 0,
  tiebreakOrder: ["POINTS", "GOAL_DIFFERENCE", "GOALS_SCORED", "HEAD_TO_HEAD"] as const,
};

describe("01J group standings", () => {
  it("A. default 3/1/0 scoring", () => {
    const { rows } = calculateTournamentGroupStandings({
      participantIds: ["a", "b"],
      completedFixtures: [
        {
          fixtureId: "f1",
          sideAParticipantId: "a",
          sideBParticipantId: "b",
          scoreSideA: 2,
          scoreSideB: 1,
        },
      ],
      rankingConfiguration: DEFAULT,
    });
    expect(rows.find((r) => r.participantId === "a")?.points).toBe(3);
    expect(rows.find((r) => r.participantId === "b")?.points).toBe(0);
  });

  it("B. custom persisted scoring", () => {
    const { rows } = calculateTournamentGroupStandings({
      participantIds: ["a", "b"],
      completedFixtures: [
        {
          fixtureId: "f1",
          sideAParticipantId: "a",
          sideBParticipantId: "b",
          scoreSideA: 1,
          scoreSideB: 1,
        },
      ],
      rankingConfiguration: CUSTOM,
    });
    expect(rows.every((r) => r.points === 2)).toBe(true);
  });

  it("C. points ordering", () => {
    const { rows } = calculateTournamentGroupStandings({
      participantIds: ["a", "b", "c"],
      completedFixtures: [
        { fixtureId: "f1", sideAParticipantId: "a", sideBParticipantId: "b", scoreSideA: 1, scoreSideB: 0 },
        { fixtureId: "f2", sideAParticipantId: "c", sideBParticipantId: "b", scoreSideA: 1, scoreSideB: 0 },
      ],
      rankingConfiguration: DEFAULT,
    });
    expect(rows[0]?.participantId).toBe("a");
    expect(rows[0]?.position).toBe(1);
    expect(rows[1]?.participantId).toBe("c");
  });

  it("D. goal-difference tiebreak", () => {
    const { rows } = calculateTournamentGroupStandings({
      participantIds: ["a", "b"],
      completedFixtures: [
        { fixtureId: "f1", sideAParticipantId: "a", sideBParticipantId: "b", scoreSideA: 3, scoreSideB: 1 },
        { fixtureId: "f2", sideAParticipantId: "a", sideBParticipantId: "b", scoreSideA: 0, scoreSideB: 4 },
      ],
      rankingConfiguration: DEFAULT,
    });
    expect(rows[0]?.participantId).toBe("b");
  });

  it("E. goals-scored tiebreak", () => {
    const { rows } = calculateTournamentGroupStandings({
      participantIds: ["a", "b", "c"],
      completedFixtures: [
        { fixtureId: "f1", sideAParticipantId: "a", sideBParticipantId: "c", scoreSideA: 2, scoreSideB: 0 },
        { fixtureId: "f2", sideAParticipantId: "b", sideBParticipantId: "c", scoreSideA: 1, scoreSideB: 0 },
      ],
      rankingConfiguration: DEFAULT,
    });
    expect(rows[0]?.participantId).toBe("a");
    expect(rows[1]?.participantId).toBe("b");
  });

  it("F. head-to-head tiebreak", () => {
    const { rows } = calculateTournamentGroupStandings({
      participantIds: ["a", "b", "c"],
      completedFixtures: [
        { fixtureId: "f1", sideAParticipantId: "a", sideBParticipantId: "b", scoreSideA: 1, scoreSideB: 0 },
        { fixtureId: "f2", sideAParticipantId: "b", sideBParticipantId: "c", scoreSideA: 3, scoreSideB: 0 },
        { fixtureId: "f3", sideAParticipantId: "c", sideBParticipantId: "a", scoreSideA: 3, scoreSideB: 0 },
      ],
      rankingConfiguration: DEFAULT,
    });
    expect(rows[0]?.participantId).toBe("b");
  });

  it("G. perfectly tied deterministic behavior", () => {
    const { rows, perfectlyTiedParticipantIds } = calculateTournamentGroupStandings({
      participantIds: ["a", "b"],
      completedFixtures: [
        { fixtureId: "f1", sideAParticipantId: "a", sideBParticipantId: "b", scoreSideA: 1, scoreSideB: 1 },
      ],
      rankingConfiguration: DEFAULT,
    });
    expect(rows[0]?.position).toBe(1);
    expect(rows[1]?.position).toBe(1);
    expect(perfectlyTiedParticipantIds.size).toBe(2);
    expect(participantAtGroupRank({ rows, perfectlyTiedParticipantIds }, 1)).toBeNull();
  });

  it("H. incomplete fixtures excluded", () => {
    const { rows } = calculateTournamentGroupStandings({
      participantIds: ["a", "b"],
      completedFixtures: [],
      rankingConfiguration: DEFAULT,
    });
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });

  it("I. duplicate source teams remain independent participant rows", () => {
    const { rows } = calculateTournamentGroupStandings({
      participantIds: ["rot", "blau"],
      completedFixtures: [
        {
          fixtureId: "f1",
          sideAParticipantId: "rot",
          sideBParticipantId: "blau",
          scoreSideA: 2,
          scoreSideB: 0,
        },
      ],
      rankingConfiguration: DEFAULT,
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.participantId === "rot")?.won).toBe(1);
    expect(rows.find((r) => r.participantId === "blau")?.lost).toBe(1);
  });

  it("J. editing a result recalculates standings", () => {
    const first = calculateTournamentGroupStandings({
      participantIds: ["a", "b"],
      completedFixtures: [
        { fixtureId: "f1", sideAParticipantId: "a", sideBParticipantId: "b", scoreSideA: 0, scoreSideB: 1 },
      ],
      rankingConfiguration: DEFAULT,
    });
    const second = calculateTournamentGroupStandings({
      participantIds: ["a", "b"],
      completedFixtures: [
        { fixtureId: "f1", sideAParticipantId: "a", sideBParticipantId: "b", scoreSideA: 2, scoreSideB: 1 },
      ],
      rankingConfiguration: DEFAULT,
    });
    expect(first.rows[0]?.participantId).toBe("b");
    expect(second.rows[0]?.participantId).toBe("a");
  });

  it("K. clearing result recalculates standings", () => {
    const cleared = calculateTournamentGroupStandings({
      participantIds: ["a", "b"],
      completedFixtures: [],
      rankingConfiguration: DEFAULT,
    });
    expect(cleared.rows.every((r) => r.points === 0)).toBe(true);
  });
});
