import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  removePlayerSquadMembership: vi.fn(),
  removeTrainerTeamMembership: vi.fn(),
  logAction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: mocks.requireApiPermission,
}));
vi.mock("@/lib/teams/roster-membership-service", () => ({
  removePlayerSquadMembership: mocks.removePlayerSquadMembership,
  removeTrainerTeamMembership: mocks.removeTrainerTeamMembership,
}));
vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { DELETE as removePlayer } from "../[teamId]/team-seasons/[teamSeasonId]/squad-members/[squadMemberId]/route";
import { DELETE as removeTrainer } from "../[teamId]/team-seasons/[teamSeasonId]/trainer-members/[trainerMemberId]/route";

const TENANT_A = "tenant-a";

function playerContext(squadMemberId = "player-member-a") {
  return {
    params: Promise.resolve({
      teamId: "team-a",
      teamSeasonId: "team-season-a",
      squadMemberId,
    }),
  };
}

function trainerContext(trainerMemberId = "trainer-member-a") {
  return {
    params: Promise.resolve({
      teamId: "team-a",
      teamSeasonId: "team-season-a",
      trainerMemberId,
    }),
  };
}

const TEAM_SEASON = {
  id: "team-season-a",
  teamId: "team-a",
  status: "ACTIVE" as const,
  team: { id: "team-a", name: "Team A", slug: "team-a", ageGroup: null },
  season: {
    id: "season-1",
    key: "2026-27",
    name: "2026/27",
    startDate: new Date("2026-07-01T00:00:00Z"),
  },
};

describe("SECURITY-GO-LIVE-01H-C — roster removal isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiPermission.mockResolvedValue({
      ok: true,
      session: { user: { id: "user-a", activeTenantId: TENANT_A } },
    });
    mocks.removePlayerSquadMembership.mockResolvedValue({
      ok: true,
      removed: {
        id: "player-member-a",
        teamSeasonId: "team-season-a",
        personId: "person-a",
        status: "ACTIVE",
        shirtNumber: null,
        positionLabel: null,
        isCaptain: false,
        isViceCaptain: false,
        isWebsiteVisible: true,
        sortOrder: 0,
        remarks: null,
        teamSeason: TEAM_SEASON,
        person: {
          id: "person-a",
          firstName: "Alice",
          lastName: "A",
          displayName: "Alice A",
          email: null,
          phone: null,
        },
      },
    });
    mocks.removeTrainerTeamMembership.mockResolvedValue({
      ok: true,
      removed: {
        id: "trainer-member-a",
        teamSeasonId: "team-season-a",
        personId: "person-a",
        status: "ACTIVE",
        roleLabel: null,
        isWebsiteVisible: true,
        sortOrder: 0,
        remarks: null,
        person: { firstName: "Alice", lastName: "A", displayName: "Alice A" },
      },
    });
  });

  it("removes an own-tenant player membership", async () => {
    const response = await removePlayer(
      new NextRequest("http://localhost"),
      playerContext(),
    );

    expect(response.status).toBe(200);
    expect(mocks.removePlayerSquadMembership).toHaveBeenCalledWith({
      tenantId: TENANT_A,
      teamId: "team-a",
      teamSeasonId: "team-season-a",
      squadMemberId: "player-member-a",
    });
  });

  it("cannot remove a foreign player relationship by id", async () => {
    mocks.removePlayerSquadMembership.mockResolvedValue({
      ok: false,
      code: "MEMBERSHIP_NOT_FOUND",
      message: "Kader-Eintrag nicht gefunden.",
    });

    const response = await removePlayer(
      new NextRequest("http://localhost"),
      playerContext("player-member-b"),
    );

    expect(response.status).toBe(404);
  });

  it("removes an own-tenant trainer membership", async () => {
    const response = await removeTrainer(
      new Request("http://localhost"),
      trainerContext(),
    );

    expect(response.status).toBe(200);
    expect(mocks.removeTrainerTeamMembership).toHaveBeenCalledWith({
      tenantId: TENANT_A,
      teamId: "team-a",
      teamSeasonId: "team-season-a",
      trainerMemberId: "trainer-member-a",
    });
  });

  it("cannot remove or change a foreign trainer relationship by id", async () => {
    mocks.removeTrainerTeamMembership.mockResolvedValue({
      ok: false,
      code: "MEMBERSHIP_NOT_FOUND",
      message: "Trainerteam-Eintrag nicht gefunden.",
    });

    const response = await removeTrainer(
      new Request("http://localhost"),
      trainerContext("trainer-member-b"),
    );

    expect(response.status).toBe(404);
  });

  it("returns equivalent not-found behavior for missing roster relationships", async () => {
    mocks.removePlayerSquadMembership.mockResolvedValue({
      ok: false,
      code: "MEMBERSHIP_NOT_FOUND",
      message: "Kader-Eintrag nicht gefunden.",
    });
    mocks.removeTrainerTeamMembership.mockResolvedValue({
      ok: false,
      code: "MEMBERSHIP_NOT_FOUND",
      message: "Trainerteam-Eintrag nicht gefunden.",
    });

    const [playerResponse, trainerResponse] = await Promise.all([
      removePlayer(new NextRequest("http://localhost"), playerContext("missing")),
      removeTrainer(new Request("http://localhost"), trainerContext("missing")),
    ]);

    expect(playerResponse.status).toBe(404);
    expect(trainerResponse.status).toBe(404);
  });
});
