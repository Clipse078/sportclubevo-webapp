import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  teamSeasonFindFirst: vi.fn(),
  teamSeasonFindMany: vi.fn(),
  personFindFirst: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    teamSeason: {
      findFirst: mocks.teamSeasonFindFirst,
      findMany: mocks.teamSeasonFindMany,
    },
    person: {
      findFirst: mocks.personFindFirst,
    },
  },
}));

import {
  mapTargetDiscoveryToPickerOptions,
  resolvePlayerReleaseTargetTeams,
} from "../player-release-target-discovery";

describe("player-release-target-discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.teamSeasonFindFirst.mockResolvedValue({
      id: "ts-b1",
      seasonId: "season-1",
      team: { category: "JUNIOREN", ageGroup: "B", genderGroup: "JUNIOREN" },
      season: { startDate: new Date("2025-07-01T00:00:00.000Z") },
    });
    mocks.personFindFirst.mockResolvedValue({
      dateOfBirth: new Date("2008-05-01T00:00:00.000Z"),
    });
    mocks.teamSeasonFindMany.mockResolvedValue([
      {
        id: "ts-b1",
        teamId: "team-b1",
        displayName: "Junioren B1",
        shortName: null,
        status: "ACTIVE",
        seasonId: "season-1",
        team: {
          id: "team-b1",
          name: "FC Allschwil Junioren B1",
          shortName: null,
          isActive: true,
          tenantId: "tenant-a",
          category: "JUNIOREN",
          ageGroup: "B",
          genderGroup: "JUNIOREN",
        },
      },
      {
        id: "ts-b2",
        teamId: "team-b2",
        displayName: "Junioren B2",
        shortName: null,
        status: "ACTIVE",
        seasonId: "season-1",
        team: {
          id: "team-b2",
          name: "FC Allschwil Junioren B2",
          shortName: null,
          isActive: true,
          tenantId: "tenant-a",
          category: "JUNIOREN",
          ageGroup: "B",
          genderGroup: "JUNIOREN",
        },
      },
      {
        id: "ts-frauen",
        teamId: "team-frauen",
        displayName: "Frauen 1",
        shortName: null,
        status: "ACTIVE",
        seasonId: "season-1",
        team: {
          id: "team-frauen",
          name: "FC Allschwil Frauen 1",
          shortName: null,
          isActive: true,
          tenantId: "tenant-a",
          category: "FRAUEN",
          ageGroup: "FRAUEN",
          genderGroup: "FRAUEN",
        },
      },
    ]);
  });

  it("excludes source team and adult category targets for junior player", async () => {
    const rows = await resolvePlayerReleaseTargetTeams({
      tenantId: "tenant-a",
      personId: "person-1",
      sourceTeamSeasonId: "ts-b1",
    });

    const ids = rows.map((row) => row.teamSeasonId);
    expect(ids).toContain("ts-b2");
    expect(ids).not.toContain("ts-b1");
    expect(ids).not.toContain("ts-frauen");
    expect(rows.every((row) => row.eligibilityState === "ELIGIBLE")).toBe(true);
  });

  it("maps eligible rows to picker options only", () => {
    const options = mapTargetDiscoveryToPickerOptions([
      {
        teamSeasonId: "ts-b2",
        teamId: "team-b2",
        label: "Junioren B2",
        secondaryLabel: "B",
        category: "JUNIOREN",
        ageGroup: "B",
        genderGroup: "JUNIOREN",
        eligibilityState: "ELIGIBLE",
        reasons: ["JUNIOR_BIRTH_YEAR_ELIGIBLE"],
      },
      {
        teamSeasonId: "ts-x",
        teamId: "team-x",
        label: "X",
        secondaryLabel: null,
        category: "FRAUEN",
        ageGroup: null,
        genderGroup: null,
        eligibilityState: "INELIGIBLE",
        reasons: ["CATEGORY_MISMATCH"],
      },
    ]);
    expect(options).toHaveLength(1);
    expect(options[0]?.teamSeasonId).toBe("ts-b2");
  });
});
