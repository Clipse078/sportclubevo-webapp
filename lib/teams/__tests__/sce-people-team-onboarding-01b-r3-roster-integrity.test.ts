/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01B-R3 — roster read model + incomplete onboarding semantics.
 */

import { describe, expect, it } from "vitest";
import { buildPersonOverviewAssignmentProjection } from "@/lib/people/person-overview-assignment-projection";
import { buildTeamCockpitMetrics } from "@/lib/teams/team-cockpit-metrics";
import type { TeamDetailData } from "@/lib/teams/queries";

const TEAM_SENIOREN = "team-senioren-40";
const PERSON_ID = "person-michael";

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B-R3 roster integrity", () => {
  it("PersonAssignment alone is incomplete player state (not canonical squad membership)", () => {
    const projection = buildPersonOverviewAssignmentProjection({
      assignments: [
        {
          id: "pa-1",
          status: "ACTIVE",
          functionKey: "SPIELER",
          team: { id: TEAM_SENIOREN, name: "FC Allschwil Senioren 40+" },
          season: { id: "s1", name: "Season 2026/2027", key: "2026/2027" },
        },
      ],
      squadMemberships: [],
      trainerMemberships: [],
    });

    expect(projection.incompletePlayerAssignments).toHaveLength(1);
    expect(projection.incompletePlayerAssignments[0]?.team?.id).toBe(TEAM_SENIOREN);
  });

  it("active PlayerSquadMember completes player state and suppresses incomplete assignment row", () => {
    const projection = buildPersonOverviewAssignmentProjection({
      assignments: [
        {
          id: "pa-1",
          status: "ACTIVE",
          functionKey: "SPIELER",
          team: { id: TEAM_SENIOREN, name: "FC Allschwil Senioren 40+" },
        },
      ],
      squadMemberships: [
        {
          status: "ACTIVE",
          teamSeason: { team: { id: TEAM_SENIOREN, name: "FC Allschwil Senioren 40+" } },
        },
      ],
      trainerMemberships: [],
    });

    expect(projection.incompletePlayerAssignments).toHaveLength(0);
  });

  it("Team overview player count matches Kader ACTIVE filter (excludes inactive rows)", () => {
    const team = {
      id: TEAM_SENIOREN,
      name: "FC Allschwil Senioren 40+",
      currentTeamSeasonId: "ts-1",
      teamSeasons: [
        {
          id: "ts-1",
          status: "ACTIVE",
          participationType: "COMPETITION",
          season: {
            id: "s1",
            key: "2026/2027",
            name: "Season 2026/2027",
            isActive: true,
          },
          playerSquadMembers: [
            {
              id: "psm-active",
              status: "ACTIVE",
              person: { id: PERSON_ID },
            },
            {
              id: "psm-inactive",
              status: "INACTIVE",
              person: { id: "other" },
            },
          ],
          trainerTeamMembers: [],
        },
      ],
    } as unknown as TeamDetailData;

    const metrics = buildTeamCockpitMetrics({
      team,
      categoryLabels: { SENIOREN: "Senioren" },
      participationTypeLabels: { COMPETITION: "Wettkampfteam" },
    });

    expect(metrics.playerCount).toBe(1);
  });
});
