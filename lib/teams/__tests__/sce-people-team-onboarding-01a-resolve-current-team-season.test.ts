/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01A — current TeamSeason resolver tests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  teamFindUnique: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    team: { findUnique: mocks.teamFindUnique },
  },
}));

import { resolveCanonicalTeamSeasonForTeam } from "../resolve-current-team-season";

const TENANT_A = "tenant-a";
const TEAM_ID = "team-f2";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveCanonicalTeamSeasonForTeam", () => {
  it("returns the TeamSeason for Season.isActive", async () => {
    mocks.teamFindUnique.mockResolvedValue({
      id: TEAM_ID,
      tenantId: TENANT_A,
      teamSeasons: [
        {
          id: "ts-old",
          teamId: TEAM_ID,
          status: "ACTIVE",
          season: {
            id: "s-old",
            key: "2025-26",
            name: "2025/26",
            isActive: false,
            startDate: new Date("2025-07-01"),
          },
        },
        {
          id: "ts-current",
          teamId: TEAM_ID,
          status: "ACTIVE",
          season: {
            id: "s-current",
            key: "2026-27",
            name: "2026/27",
            isActive: true,
            startDate: new Date("2026-07-01"),
          },
        },
      ],
    });

    const result = await resolveCanonicalTeamSeasonForTeam({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.teamSeason.id).toBe("ts-current");
  });

  it("returns NO_CURRENT_TEAM_SEASON when active season has no row", async () => {
    mocks.teamFindUnique.mockResolvedValue({
      id: TEAM_ID,
      tenantId: TENANT_A,
      teamSeasons: [
        {
          id: "ts-old",
          teamId: TEAM_ID,
          status: "ACTIVE",
          season: {
            id: "s-old",
            key: "2025-26",
            name: "2025/26",
            isActive: false,
            startDate: new Date("2025-07-01"),
          },
        },
      ],
    });

    const result = await resolveCanonicalTeamSeasonForTeam({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_CURRENT_TEAM_SEASON");
  });

  it("masks cross-tenant team as not found", async () => {
    mocks.teamFindUnique.mockResolvedValue({
      id: TEAM_ID,
      tenantId: "tenant-b",
      teamSeasons: [],
    });

    const result = await resolveCanonicalTeamSeasonForTeam({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("TEAM_TENANT_MISMATCH");
    expect(result.message).toBe("Team nicht gefunden.");
  });

  it("detects ambiguous global active seasons", async () => {
    mocks.teamFindUnique.mockResolvedValue({
      id: TEAM_ID,
      tenantId: TENANT_A,
      teamSeasons: [
        {
          id: "ts-a",
          teamId: TEAM_ID,
          status: "ACTIVE",
          season: {
            id: "s1",
            key: "2026-27",
            name: "2026/27",
            isActive: true,
            startDate: new Date("2026-07-01"),
          },
        },
        {
          id: "ts-b",
          teamId: TEAM_ID,
          status: "ACTIVE",
          season: {
            id: "s2",
            key: "2027-28",
            name: "2027/28",
            isActive: true,
            startDate: new Date("2027-07-01"),
          },
        },
      ],
    });

    const result = await resolveCanonicalTeamSeasonForTeam({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("AMBIGUOUS_CURRENT_TEAM_SEASON");
  });
});
