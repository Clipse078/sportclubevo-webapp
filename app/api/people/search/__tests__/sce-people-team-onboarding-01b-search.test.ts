import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireContext: vi.fn(),
  teamSeasonFindFirst: vi.fn(),
  personFindMany: vi.fn(),
  getAllowedBirthYearsForSeason: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-tenant-context", () => ({
  requireApiTenantPermissionContext: mocks.requireContext,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    teamSeason: { findFirst: mocks.teamSeasonFindFirst },
    person: { findMany: mocks.personFindMany },
  },
}));
vi.mock("@/lib/teams/jahrgang-rules", () => ({
  getAllowedBirthYearsForSeason: mocks.getAllowedBirthYearsForSeason,
}));

import { GET } from "@/app/api/people/search/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireContext.mockResolvedValue({
    ok: true,
    context: { tenantId: "tenant-a", actorUserId: "actor-a" },
  });
  mocks.getAllowedBirthYearsForSeason.mockReturnValue([2012]);
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B people search roster context", () => {
  it("excludes only ACTIVE squad members and includes non-player-capable persons", async () => {
    mocks.teamSeasonFindFirst.mockResolvedValue({
      season: { startDate: new Date("2026-07-01T00:00:00.000Z") },
      team: { ageGroup: "F2" },
      playerSquadMembers: [{ personId: "active-player" }],
    });

    mocks.personFindMany.mockResolvedValue([
      {
        id: "active-player",
        firstName: "A",
        lastName: "Active",
        displayName: null,
        email: null,
        phone: null,
        dateOfBirth: new Date("2012-01-01T00:00:00.000Z"),
        isActive: true,
        isPlayer: true,
        isTrainer: false,
      },
      {
        id: "needs-capacity",
        firstName: "N",
        lastName: "Capacity",
        displayName: null,
        email: null,
        phone: null,
        dateOfBirth: new Date("2012-01-01T00:00:00.000Z"),
        isActive: true,
        isPlayer: false,
        isTrainer: false,
      },
    ]);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/people/search?q=Ca&mode=player&teamSeasonId=ts-1",
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.map((p: { id: string }) => p.id)).toEqual(["needs-capacity"]);
    expect(mocks.personFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ isPlayer: true }),
      }),
    );
    expect(mocks.teamSeasonFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          playerSquadMembers: expect.objectContaining({
            where: { status: "ACTIVE" },
          }),
        }),
      }),
    );
  });
});
