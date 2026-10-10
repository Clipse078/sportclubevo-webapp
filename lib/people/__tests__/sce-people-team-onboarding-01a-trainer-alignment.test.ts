/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01A — PersonAssignment vs TrainerTeamMember diagnostic.
 */

import { describe, expect, it } from "vitest";
import { PERSON_FUNCTIONS } from "@/lib/people/functions";
import {
  classifyTrainerRosterAlignmentForTeam,
  summarizePersonTrainerRosterAlignment,
} from "../trainer-roster-alignment-diagnostic";

const TEAM_F2 = "team-f2";

describe("trainer roster alignment diagnostic", () => {
  it("ALIGNED when assignment and active roster exist", () => {
    const state = classifyTrainerRosterAlignmentForTeam({
      teamId: TEAM_F2,
      assignments: [
        {
          status: "ACTIVE",
          functionKey: PERSON_FUNCTIONS.HEAD_COACH,
          team: { id: TEAM_F2, name: "F2" },
        },
      ],
      trainerMemberships: [
        {
          status: "ACTIVE",
          teamSeason: { team: { id: TEAM_F2, name: "F2" } },
        },
      ],
    });
    expect(state).toBe("ALIGNED");
  });

  it("ASSIGNMENT_ONLY — F2 expected discovery state", () => {
    const state = classifyTrainerRosterAlignmentForTeam({
      teamId: TEAM_F2,
      assignments: [
        {
          status: "ACTIVE",
          functionKey: PERSON_FUNCTIONS.HEAD_COACH,
          team: { id: TEAM_F2, name: "F2" },
        },
      ],
      trainerMemberships: [],
    });
    expect(state).toBe("ASSIGNMENT_ONLY");
  });

  it("ROSTER_ONLY when TrainerTeamMember exists without assignment", () => {
    const state = classifyTrainerRosterAlignmentForTeam({
      teamId: TEAM_F2,
      assignments: [],
      trainerMemberships: [
        {
          status: "ACTIVE",
          teamSeason: { team: { id: TEAM_F2 } },
        },
      ],
    });
    expect(state).toBe("ROSTER_ONLY");
  });

  it("NEITHER when no trainer evidence", () => {
    expect(
      classifyTrainerRosterAlignmentForTeam({
        teamId: TEAM_F2,
        assignments: [],
        trainerMemberships: [],
      }),
    ).toBe("NEITHER");
  });

  it("summarizePersonTrainerRosterAlignment aggregates flags", () => {
    const summary = summarizePersonTrainerRosterAlignment({
      assignments: [
        {
          status: "ACTIVE",
          functionKey: PERSON_FUNCTIONS.HEAD_COACH,
          team: { id: TEAM_F2 },
        },
      ],
      trainerMemberships: [
        {
          status: "ACTIVE",
          teamSeason: { team: { id: "team-other" } },
        },
      ],
    });

    expect(summary.hasAnyAssignmentOnly).toBe(true);
    expect(summary.hasAnyRosterOnly).toBe(true);
    expect(summary.byTeam).toEqual(
      expect.arrayContaining([
        { teamId: TEAM_F2, state: "ASSIGNMENT_ONLY" },
        { teamId: "team-other", state: "ROSTER_ONLY" },
      ]),
    );
  });
});
