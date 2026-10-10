/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01B-R4C — STATE A/B/C end-to-end read-model invariants.
 *
 * PersonAssignment ≠ seasonal Kader membership; ACTIVE PlayerSquadMember is canonical.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPersonOverviewAssignmentProjection } from "@/lib/people/person-overview-assignment-projection";
import { buildTeamCockpitMetrics } from "@/lib/teams/team-cockpit-metrics";
import type { TeamDetailData } from "@/lib/teams/queries";
import { resolveTeamAudiencePersonIds } from "@/lib/requirements/requirement-audience-resolvers";
import { PERSON_FUNCTIONS } from "@/lib/people/functions";

const mocks = vi.hoisted(() => ({
  teamFindMany: vi.fn(),
  teamSeasonFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    team: { findMany: mocks.teamFindMany },
    teamSeason: { findMany: mocks.teamSeasonFindMany },
  },
}));

const TENANT = "tenant-fca";
const TEAM_SENIOREN = "cmrkh1j0v000004juw4tsumks";
const PERSON_MICHAEL = "cmsnqz0qz000004l8g2efoyhw";
const TEAM_SEASON = "cmsod03tv000h04juo7wyen7w";

const playerAssignment = {
  id: "pa-senioren-spieler",
  status: "ACTIVE",
  functionKey: "SPIELER",
  team: { id: TEAM_SENIOREN, name: "FC Allschwil Senioren 40+" },
  season: { id: "season-2627", name: "Season 2026/2027", key: "2026/2027" },
};

function teamDetailWithSquad(
  squad: Array<{ id: string; status: string; personId: string }>,
): TeamDetailData {
  return {
    id: TEAM_SENIOREN,
    name: "FC Allschwil Senioren 40+",
    currentTeamSeasonId: TEAM_SEASON,
    teamSeasons: [
      {
        id: TEAM_SEASON,
        status: "ACTIVE",
        participationType: "COMPETITION",
        season: {
          id: "season-2627",
          key: "2026/2027",
          name: "Season 2026/2027",
          isActive: true,
        },
        playerSquadMembers: squad.map((row) => ({
          id: row.id,
          status: row.status,
          person: { id: row.personId },
        })),
        trainerTeamMembers: [],
      },
    ],
  } as unknown as TeamDetailData;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.teamFindMany.mockResolvedValue([{ id: TEAM_SENIOREN, tenantId: TENANT }]);
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B-R4C STATE A — assignment only", () => {
  it("marks Person Overview incomplete, zero team metrics, no COMM structural membership", async () => {
    const projection = buildPersonOverviewAssignmentProjection({
      assignments: [playerAssignment],
      squadMemberships: [],
      trainerMemberships: [],
    });

    expect(projection.incompletePlayerAssignments).toHaveLength(1);
    expect(projection.incompletePlayerAssignments[0]?.team?.id).toBe(TEAM_SENIOREN);

    const metrics = buildTeamCockpitMetrics({
      team: teamDetailWithSquad([]),
      categoryLabels: { SENIOREN: "Senioren" },
      participationTypeLabels: { COMPETITION: "Wettkampfteam" },
    });
    expect(metrics.playerCount).toBe(0);

    mocks.teamSeasonFindMany.mockResolvedValue([
      { playerSquadMembers: [], trainerTeamMembers: [] },
    ]);
    const structural = await resolveTeamAudiencePersonIds(TENANT, [TEAM_SENIOREN]);
    expect(structural).toEqual([]);
  });
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B-R4C STATE B — assignment + ACTIVE PlayerSquadMember", () => {
  it("completes overview, Kader count 1, COMM structural membership once", async () => {
    const squadRow = {
      status: "ACTIVE",
      teamSeason: {
        team: { id: TEAM_SENIOREN, name: "FC Allschwil Senioren 40+" },
      },
    };

    const projection = buildPersonOverviewAssignmentProjection({
      assignments: [playerAssignment],
      squadMemberships: [squadRow],
      trainerMemberships: [],
    });

    expect(projection.incompletePlayerAssignments).toHaveLength(0);

    const metrics = buildTeamCockpitMetrics({
      team: teamDetailWithSquad([
        { id: "psm-michael", status: "ACTIVE", personId: PERSON_MICHAEL },
      ]),
      categoryLabels: { SENIOREN: "Senioren" },
      participationTypeLabels: { COMPETITION: "Wettkampfteam" },
    });
    expect(metrics.playerCount).toBe(1);

    mocks.teamSeasonFindMany.mockResolvedValue([
      {
        playerSquadMembers: [
          {
            status: "ACTIVE",
            person: { id: PERSON_MICHAEL, isActive: true, tenantId: TENANT },
          },
        ],
        trainerTeamMembers: [],
      },
    ]);
    const structural = await resolveTeamAudiencePersonIds(TENANT, [TEAM_SENIOREN]);
    expect(structural).toEqual([PERSON_MICHAEL]);
  });
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B-R4C STATE C — membership inactive/removed", () => {
  it("excludes inactive squad from metrics and COMM; overview incomplete again", async () => {
    const projection = buildPersonOverviewAssignmentProjection({
      assignments: [playerAssignment],
      squadMemberships: [
        {
          status: "INACTIVE",
          teamSeason: {
            team: { id: TEAM_SENIOREN, name: "FC Allschwil Senioren 40+" },
          },
        },
      ],
      trainerMemberships: [],
    });

    expect(projection.incompletePlayerAssignments).toHaveLength(1);

    const metrics = buildTeamCockpitMetrics({
      team: teamDetailWithSquad([
        { id: "psm-inactive", status: "INACTIVE", personId: PERSON_MICHAEL },
      ]),
      categoryLabels: { SENIOREN: "Senioren" },
      participationTypeLabels: { COMPETITION: "Wettkampfteam" },
    });
    expect(metrics.playerCount).toBe(0);

    mocks.teamSeasonFindMany.mockResolvedValue([
      { playerSquadMembers: [], trainerTeamMembers: [] },
    ]);
    const structural = await resolveTeamAudiencePersonIds(TENANT, [TEAM_SENIOREN]);
    expect(structural).toEqual([]);
  });
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B-R4C F2 trainer dedupe (regression)", () => {
  it("shows F2 trainer sporting context exactly once in projection", () => {
    const f2Team = "team-f2";
    const projection = buildPersonOverviewAssignmentProjection({
      assignments: [
        {
          id: "pa-f2-head",
          status: "ACTIVE",
          functionKey: PERSON_FUNCTIONS.HEAD_COACH,
          team: { id: f2Team, name: "Junioren F2" },
        },
      ],
      squadMemberships: [],
      trainerMemberships: [
        {
          status: "ACTIVE",
          teamSeason: { team: { id: f2Team, name: "Junioren F2" } },
        },
      ],
    });

    expect(projection.incompleteTrainerAssignments).toHaveLength(0);
    expect(projection.weitereAssignments.map((a) => a.id)).toEqual([]);
    expect(projection.suppressedFromWeitereIds).toContain("pa-f2-head");
  });
});
