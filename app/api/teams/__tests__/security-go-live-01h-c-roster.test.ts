import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  addPlayerToTeamSeason: vi.fn(),
  addTrainerToTeamSeason: vi.fn(),
  logAction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/permissions/require-api-permission", () => ({
  requireApiPermission: mocks.requireApiPermission,
}));
vi.mock("@/lib/teams/roster-membership-service", () => ({
  addPlayerToTeamSeason: mocks.addPlayerToTeamSeason,
  addTrainerToTeamSeason: mocks.addTrainerToTeamSeason,
}));
vi.mock("@/lib/audit/log-action", () => ({ logAction: mocks.logAction }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { POST as addPlayer } from "../[teamId]/team-seasons/[teamSeasonId]/squad-members/route";
import { POST as addTrainer } from "../[teamId]/team-seasons/[teamSeasonId]/trainer-members/route";

const TENANT_A = "tenant-a";
const TEAM_A = "team-a";
const TEAM_SEASON_A = "team-season-a";
const PERSON_A = "person-a";

function access(activeTenantId: string | null = TENANT_A) {
  return {
    ok: true,
    session: { user: { id: "user-a", activeTenantId } },
  };
}

function request(personId = PERSON_A) {
  return new NextRequest("http://localhost/api/teams/roster", {
    method: "POST",
    body: JSON.stringify({ personId }),
  });
}

function context(teamId = TEAM_A, teamSeasonId = TEAM_SEASON_A) {
  return { params: Promise.resolve({ teamId, teamSeasonId }) };
}

const TEAM_SEASON = {
  id: TEAM_SEASON_A,
  teamId: TEAM_A,
  status: "ACTIVE" as const,
  team: {
    id: TEAM_A,
    name: "Tenant A Team",
    slug: "tenant-a-team",
    ageGroup: null,
  },
  season: {
    id: "season-1",
    key: "2026-27",
    name: "2026/27",
    startDate: new Date("2026-07-01T00:00:00Z"),
  },
};

const PLAYER = {
  id: PERSON_A,
  firstName: "Alice",
  lastName: "A",
  displayName: "Alice A",
  email: null,
  phone: null,
  dateOfBirth: null,
  isActive: true,
  isPlayer: true,
};

const TRAINER = {
  id: PERSON_A,
  firstName: "Alice",
  lastName: "A",
  displayName: "Alice A",
  isActive: true,
  isTrainer: true,
};

describe("SECURITY-GO-LIVE-01H-C — roster relationship isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireApiPermission.mockResolvedValue(access());
    mocks.addPlayerToTeamSeason.mockResolvedValue({
      ok: true,
      outcome: "CREATED",
      squadMember: {
        id: "player-member-a",
        status: "ACTIVE",
        shirtNumber: null,
        positionLabel: null,
        isCaptain: false,
        isViceCaptain: false,
        isWebsiteVisible: true,
        sortOrder: 0,
        remarks: null,
        person: PLAYER,
      },
      teamSeason: TEAM_SEASON,
      personSummary: PLAYER,
      jahrgang: { allowedBirthYears: [], birthYear: null },
    });
    mocks.addTrainerToTeamSeason.mockResolvedValue({
      ok: true,
      outcome: "CREATED",
      trainerMember: {
        id: "trainer-member-a",
        status: "ACTIVE",
        roleLabel: null,
        isWebsiteVisible: true,
        sortOrder: 0,
        remarks: null,
        person: { ...PLAYER, email: null, phone: null },
      },
      teamSeason: TEAM_SEASON,
      personSummary: TRAINER,
    });
  });

  it("adds a Tenant A player to a Tenant A TeamSeason", async () => {
    const response = await addPlayer(request(), context());

    expect(response.status).toBe(201);
    expect(mocks.addPlayerToTeamSeason).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A,
        teamId: TEAM_A,
        teamSeasonId: TEAM_SEASON_A,
        personId: PERSON_A,
      }),
    );
  });

  it("rejects Tenant A TeamSeason plus Tenant B Person", async () => {
    mocks.addPlayerToTeamSeason.mockResolvedValue({
      ok: false,
      code: "PERSON_NOT_FOUND",
      message: "Person nicht gefunden.",
    });

    const response = await addPlayer(request("person-b"), context());

    expect(response.status).toBe(404);
  });

  it("rejects Tenant B TeamSeason plus Tenant A Person for Tenant A", async () => {
    mocks.addPlayerToTeamSeason.mockResolvedValue({
      ok: false,
      code: "TEAM_SEASON_NOT_FOUND",
      message: "Team-Saison nicht gefunden.",
    });

    const response = await addPlayer(
      request("person-b"),
      context("team-b", "team-season-b"),
    );

    expect(response.status).toBe(404);
  });

  it("adds a Tenant A trainer to a Tenant A TeamSeason", async () => {
    const response = await addTrainer(request(), context());

    expect(response.status).toBe(201);
    expect(mocks.addTrainerToTeamSeason).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_A,
        teamId: TEAM_A,
        teamSeasonId: TEAM_SEASON_A,
        personId: PERSON_A,
      }),
    );
  });

  it("rejects a Tenant B Person as trainer", async () => {
    mocks.addTrainerToTeamSeason.mockResolvedValue({
      ok: false,
      code: "PERSON_NOT_FOUND",
      message: "Person nicht gefunden.",
    });

    const response = await addTrainer(request("person-b"), context());

    expect(response.status).toBe(404);
  });

  it("rejects trainer assignment through a Tenant B TeamSeason", async () => {
    mocks.addTrainerToTeamSeason.mockResolvedValue({
      ok: false,
      code: "TEAM_SEASON_NOT_FOUND",
      message: "Team-Saison nicht gefunden.",
    });

    const response = await addTrainer(request(), context("team-b", "team-season-b"));

    expect(response.status).toBe(404);
  });

  it("fails roster mutations closed without an active tenant", async () => {
    mocks.requireApiPermission.mockResolvedValue(access(null));

    const [playerResponse, trainerResponse] = await Promise.all([
      addPlayer(request(), context()),
      addTrainer(request(), context()),
    ]);

    expect(playerResponse.status).toBe(403);
    expect(trainerResponse.status).toBe(403);
    expect(mocks.addPlayerToTeamSeason).not.toHaveBeenCalled();
    expect(mocks.addTrainerToTeamSeason).not.toHaveBeenCalled();
  });
});
