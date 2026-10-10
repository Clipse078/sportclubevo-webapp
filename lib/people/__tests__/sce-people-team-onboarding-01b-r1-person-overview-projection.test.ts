/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01B-R1 — Person Übersicht deduplication.
 */

import { describe, expect, it } from "vitest";
import {
  buildPersonOverviewAssignmentProjection,
  personAssignmentRepeatsSportingMembership,
} from "@/lib/people/person-overview-assignment-projection";
import { PERSON_FUNCTIONS } from "@/lib/people/functions";

const teamF2 = { id: "team-f2", name: "FC Allschwil Junioren F2" };
const teamF1 = { id: "team-f1", name: "FC Allschwil Junioren F1" };

function assignment(
  id: string,
  functionKey: string,
  team: { id: string; name: string } | null = teamF2,
) {
  return { id, status: "ACTIVE", functionKey, team };
}

describe("buildPersonOverviewAssignmentProjection", () => {
  it("hides trainer PersonAssignment when TrainerTeamMember exists for same team (Human UAT F2)", () => {
    const result = buildPersonOverviewAssignmentProjection({
      assignments: [assignment("a-trainer", PERSON_FUNCTIONS.HEAD_COACH)],
      squadMemberships: [],
      trainerMemberships: [{ status: "ACTIVE", teamSeason: { team: teamF2 } }],
    });

    expect(result.incompleteTrainerAssignments).toHaveLength(0);
    expect(result.weitereAssignments.map((a) => a.id)).toEqual([]);
    expect(result.suppressedFromWeitereIds).toContain("a-trainer");
  });

  it("keeps distinct organisational assignment (Teammanager) with trainer membership", () => {
    const result = buildPersonOverviewAssignmentProjection({
      assignments: [assignment("a-tm", PERSON_FUNCTIONS.TEAM_MANAGER)],
      squadMemberships: [],
      trainerMemberships: [{ status: "ACTIVE", teamSeason: { team: teamF2 } }],
    });

    expect(result.weitereAssignments.map((a) => a.id)).toEqual(["a-tm"]);
  });

  it("shows incomplete trainer assignment when no TrainerTeamMember", () => {
    const result = buildPersonOverviewAssignmentProjection({
      assignments: [assignment("a-trainer", PERSON_FUNCTIONS.HEAD_COACH)],
      squadMemberships: [],
      trainerMemberships: [],
    });

    expect(result.incompleteTrainerAssignments.map((a) => a.id)).toEqual(["a-trainer"]);
    expect(result.weitereAssignments).toHaveLength(0);
  });

  it("TrainerTeamMember only — no assignments", () => {
    const result = buildPersonOverviewAssignmentProjection({
      assignments: [],
      squadMemberships: [],
      trainerMemberships: [{ status: "ACTIVE", teamSeason: { team: teamF2 } }],
    });

    expect(result.weitereAssignments).toHaveLength(0);
    expect(result.incompleteTrainerAssignments).toHaveLength(0);
  });

  it("PersonAssignment only — surfaces under incomplete trainer", () => {
    const result = buildPersonOverviewAssignmentProjection({
      assignments: [assignment("only-assign", PERSON_FUNCTIONS.HEAD_COACH)],
      squadMemberships: [],
      trainerMemberships: [],
    });

    expect(result.incompleteTrainerAssignments.map((a) => a.id)).toEqual(["only-assign"]);
  });

  it("Player squad + unrelated org assignment retained", () => {
    const result = buildPersonOverviewAssignmentProjection({
      assignments: [
        assignment("player-assign", PERSON_FUNCTIONS.PLAYER, teamF2),
        assignment("board", PERSON_FUNCTIONS.BOARD_MEMBER, null),
      ],
      squadMemberships: [{ status: "ACTIVE", teamSeason: { team: teamF2 } }],
      trainerMemberships: [],
    });

    expect(result.weitereAssignments.map((a) => a.id)).toEqual(["board"]);
    expect(result.suppressedFromWeitereIds).toContain("player-assign");
  });

  it("multi-team: suppresses only matching team trainer assignment", () => {
    const result = buildPersonOverviewAssignmentProjection({
      assignments: [
        assignment("f2-trainer", PERSON_FUNCTIONS.HEAD_COACH, teamF2),
        assignment("f1-trainer", PERSON_FUNCTIONS.HEAD_COACH, teamF1),
      ],
      squadMemberships: [],
      trainerMemberships: [{ status: "ACTIVE", teamSeason: { team: teamF2 } }],
    });

    expect(result.incompleteTrainerAssignments.map((a) => a.id)).toEqual(["f1-trainer"]);
    expect(result.suppressedFromWeitereIds).toContain("f2-trainer");
  });

  it("inactive trainer membership does not suppress assignment", () => {
    const result = buildPersonOverviewAssignmentProjection({
      assignments: [assignment("a-trainer", PERSON_FUNCTIONS.HEAD_COACH)],
      squadMemberships: [],
      trainerMemberships: [{ status: "INACTIVE", teamSeason: { team: teamF2 } }],
    });

    expect(result.incompleteTrainerAssignments.map((a) => a.id)).toEqual(["a-trainer"]);
  });
});

describe("personAssignmentRepeatsSportingMembership", () => {
  it("matches trainer keys only for sporting subset", () => {
    const playerIds = new Set([teamF2.id]);
    const trainerIds = new Set([teamF2.id]);

    expect(
      personAssignmentRepeatsSportingMembership(
        assignment("x", PERSON_FUNCTIONS.HEAD_COACH),
        playerIds,
        trainerIds,
      ),
    ).toBe(true);

    expect(
      personAssignmentRepeatsSportingMembership(
        assignment("x", PERSON_FUNCTIONS.TEAM_MANAGER),
        playerIds,
        trainerIds,
      ),
    ).toBe(false);
  });
});
