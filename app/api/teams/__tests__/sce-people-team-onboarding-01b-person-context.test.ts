import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  loadRosterPersonOnboardingContext: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: mocks.requireApiPermission,
}));

vi.mock("@/lib/teams/roster-onboarding-queries", () => ({
  loadRosterPersonOnboardingContext: mocks.loadRosterPersonOnboardingContext,
}));

import { GET } from "../[teamId]/team-seasons/[teamSeasonId]/roster-onboarding/person-context/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiPermission.mockResolvedValue({
    ok: true,
    session: { user: { activeTenantId: "tenant-a" } },
  });
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01B person-context route", () => {
  it("requires teams.view and returns tenant-scoped context", async () => {
    mocks.loadRosterPersonOnboardingContext.mockResolvedValue({
      person: { id: "p1", isPlayer: true, isTrainer: false },
      squadMembership: null,
      trainerMembership: null,
      otherActivePlayerSquads: [],
      otherActiveTrainerTeams: [],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/teams/t1/team-seasons/ts1/roster-onboarding/person-context?personId=p1",
      ),
      { params: Promise.resolve({ teamId: "t1", teamSeasonId: "ts1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.requireApiPermission).toHaveBeenCalledWith("teams.view");
    expect(mocks.loadRosterPersonOnboardingContext).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      teamId: "t1",
      teamSeasonId: "ts1",
      personId: "p1",
    });
  });

  it("masks foreign person as 404", async () => {
    mocks.loadRosterPersonOnboardingContext.mockResolvedValue(null);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/teams/t1/team-seasons/ts1/roster-onboarding/person-context?personId=foreign",
      ),
      { params: Promise.resolve({ teamId: "t1", teamSeasonId: "ts1" }) },
    );

    expect(response.status).toBe(404);
  });
});
