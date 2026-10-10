/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01A — COMM-03 structural team audience contract.
 *
 * Proves canonical roster rows feed COMM-03 candidate resolution without changing policy code.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { resolveTeamAudiencePersonIds } from "@/lib/requirements/requirement-audience-resolvers";

const TENANT_A = "tenant-a";
const TEAM_ID = "team-f2";
const PERSON_PLAYER = "person-player";
const PERSON_TRAINER = "person-trainer";

function rosterTeamSeasons(
  players: Array<{ personId: string; status: string; isActive?: boolean }>,
  trainers: Array<{ personId: string; status: string; isActive?: boolean }>,
) {
  return [
    {
      playerSquadMembers: players.map((p) => ({
        status: p.status,
        person: {
          id: p.personId,
          isActive: p.isActive ?? true,
          tenantId: TENANT_A,
        },
      })),
      trainerTeamMembers: trainers.map((t) => ({
        status: t.status,
        person: {
          id: t.personId,
          isActive: t.isActive ?? true,
          tenantId: TENANT_A,
        },
      })),
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.teamFindMany.mockResolvedValue([{ id: TEAM_ID, tenantId: TENANT_A }]);
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01A COMM-03 contract", () => {
  it("empty roster yields no structural candidates", async () => {
    mocks.teamSeasonFindMany.mockResolvedValue(rosterTeamSeasons([], []));

    const ids = await resolveTeamAudiencePersonIds(TENANT_A, [TEAM_ID]);
    expect(ids).toEqual([]);
  });

  it("active player membership enters structural candidates", async () => {
    mocks.teamSeasonFindMany.mockResolvedValue(
      rosterTeamSeasons([{ personId: PERSON_PLAYER, status: "ACTIVE" }], []),
    );

    const ids = await resolveTeamAudiencePersonIds(TENANT_A, [TEAM_ID]);
    expect(ids).toEqual([PERSON_PLAYER]);
  });

  it("active trainer membership enters structural candidates", async () => {
    mocks.teamSeasonFindMany.mockResolvedValue(
      rosterTeamSeasons([], [{ personId: PERSON_TRAINER, status: "ACTIVE" }]),
    );

    const ids = await resolveTeamAudiencePersonIds(TENANT_A, [TEAM_ID]);
    expect(ids).toEqual([PERSON_TRAINER]);
  });

  it("inactive memberships are excluded", async () => {
    // Prisma query filters status=ACTIVE on membership rows; inactive rows are not returned.
    mocks.teamSeasonFindMany.mockResolvedValue(rosterTeamSeasons([], []));

    const ids = await resolveTeamAudiencePersonIds(TENANT_A, [TEAM_ID]);
    expect(ids).toEqual([]);
  });

  it("dedupes when person appears as player and trainer", async () => {
    mocks.teamSeasonFindMany.mockResolvedValue(
      rosterTeamSeasons(
        [{ personId: PERSON_PLAYER, status: "ACTIVE" }],
        [{ personId: PERSON_PLAYER, status: "ACTIVE" }],
      ),
    );

    const ids = await resolveTeamAudiencePersonIds(TENANT_A, [TEAM_ID]);
    expect(ids).toEqual([PERSON_PLAYER]);
  });

  it("rejects cross-tenant team ids", async () => {
    mocks.teamFindMany.mockResolvedValue([{ id: TEAM_ID, tenantId: "tenant-b" }]);

    await expect(resolveTeamAudiencePersonIds(TENANT_A, [TEAM_ID])).rejects.toThrow(
      "INVALID_TEAM_AUDIENCE",
    );
  });
});
