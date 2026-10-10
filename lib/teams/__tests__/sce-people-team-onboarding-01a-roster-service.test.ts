/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01A — canonical roster membership service tests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerSquadStatus, TrainerTeamStatus } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  teamSeasonFindFirst: vi.fn(),
  personFindFirst: vi.fn(),
  playerFindUnique: vi.fn(),
  playerCreate: vi.fn(),
  playerUpdate: vi.fn(),
  playerFindFirst: vi.fn(),
  playerDelete: vi.fn(),
  trainerFindUnique: vi.fn(),
  trainerCreate: vi.fn(),
  trainerUpdate: vi.fn(),
  trainerFindFirst: vi.fn(),
  trainerDelete: vi.fn(),
  userCreate: vi.fn(),
  jahrgang: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    teamSeason: { findFirst: mocks.teamSeasonFindFirst },
    person: { findFirst: mocks.personFindFirst },
    playerSquadMember: {
      findUnique: mocks.playerFindUnique,
      create: mocks.playerCreate,
      update: mocks.playerUpdate,
      findFirst: mocks.playerFindFirst,
      delete: mocks.playerDelete,
    },
    trainerTeamMember: {
      findUnique: mocks.trainerFindUnique,
      create: mocks.trainerCreate,
      update: mocks.trainerUpdate,
      findFirst: mocks.trainerFindFirst,
      delete: mocks.trainerDelete,
    },
    user: { create: mocks.userCreate },
  },
}));

vi.mock("@/lib/teams/player-birth-year-eligibility", () => ({
  evaluatePlayerBirthYearEligibility: mocks.jahrgang,
}));

import {
  addPlayerToTeamSeason,
  addTrainerToTeamSeason,
  removePlayerSquadMembership,
  removeTrainerTeamMembership,
} from "../roster-membership-service";

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const TEAM_ID = "team-1";
const TEAM_SEASON_ID = "ts-1";
const PERSON_ID = "person-1";

const ACTIVE_TEAM_SEASON = {
  id: TEAM_SEASON_ID,
  teamId: TEAM_ID,
  status: "ACTIVE" as const,
  team: {
    id: TEAM_ID,
    name: "F2",
    slug: "f2",
    ageGroup: "F",
  },
  season: {
    id: "season-1",
    key: "2026-27",
    name: "2026/27",
    startDate: new Date("2026-07-01T00:00:00Z"),
  },
};

const PLAYER_PERSON = {
  id: PERSON_ID,
  firstName: "Max",
  lastName: "Muster",
  displayName: null,
  email: null,
  phone: null,
  dateOfBirth: new Date("2017-05-01"),
  isActive: true,
  isPlayer: true,
  userId: null,
};

const TRAINER_PERSON = {
  id: PERSON_ID,
  firstName: "Tina",
  lastName: "Trainer",
  displayName: null,
  isActive: true,
  isTrainer: true,
};

const SQUAD_SELECT = {
  id: "psm-1",
  status: "ACTIVE" as PlayerSquadStatus,
  shirtNumber: 9,
  positionLabel: null,
  isCaptain: false,
  isViceCaptain: false,
  isWebsiteVisible: true,
  sortOrder: 0,
  remarks: null,
  person: {
    id: PERSON_ID,
    firstName: "Max",
    lastName: "Muster",
    displayName: null,
    email: null,
    phone: null,
    dateOfBirth: PLAYER_PERSON.dateOfBirth,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.teamSeasonFindFirst.mockResolvedValue(ACTIVE_TEAM_SEASON);
  mocks.jahrgang.mockReturnValue({
    ok: true,
    kind: "ELIGIBLE",
    allowedBirthYears: [2017, 2018],
    birthYear: 2017,
    teamContext: { mode: "JUNIOR_BIRTH_YEAR", allowedBirthYears: [2017, 2018] },
  });
  mocks.playerFindUnique.mockResolvedValue(null);
  mocks.trainerFindUnique.mockResolvedValue(null);
  mocks.playerCreate.mockResolvedValue(SQUAD_SELECT);
  mocks.trainerCreate.mockResolvedValue({
    id: "ttm-1",
    status: "ACTIVE",
    roleLabel: "Cheftrainer",
    isWebsiteVisible: true,
    sortOrder: 0,
    remarks: null,
    person: {
      id: PERSON_ID,
      firstName: "Tina",
      lastName: "Trainer",
      displayName: null,
      email: null,
      phone: null,
    },
  });
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01A — addPlayerToTeamSeason", () => {
  it("creates an active player membership", async () => {
    mocks.personFindFirst.mockResolvedValue(PLAYER_PERSON);

    const result = await addPlayerToTeamSeason({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      personId: PERSON_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe("CREATED");
    expect(mocks.playerCreate).toHaveBeenCalledOnce();
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });

  it("returns ALREADY_ACTIVE without creating a duplicate row", async () => {
    mocks.personFindFirst.mockResolvedValue(PLAYER_PERSON);
    mocks.playerFindUnique.mockResolvedValue(SQUAD_SELECT);

    const result = await addPlayerToTeamSeason({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      personId: PERSON_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe("ALREADY_ACTIVE");
    expect(mocks.playerCreate).not.toHaveBeenCalled();
  });

  it("reactivates INACTIVE membership instead of inserting", async () => {
    mocks.personFindFirst.mockResolvedValue(PLAYER_PERSON);
    mocks.playerFindUnique.mockResolvedValue({
      ...SQUAD_SELECT,
      status: "INACTIVE",
    });
    mocks.playerUpdate.mockResolvedValue(SQUAD_SELECT);

    const result = await addPlayerToTeamSeason({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      personId: PERSON_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe("REACTIVATED");
    expect(mocks.playerUpdate).toHaveBeenCalledOnce();
    expect(mocks.playerCreate).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant Person with not-found semantics", async () => {
    mocks.personFindFirst.mockResolvedValue(null);

    const result = await addPlayerToTeamSeason({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      personId: "person-other-tenant",
    });

    expect(result).toEqual({
      ok: false,
      code: "PERSON_NOT_FOUND",
      message: "Person nicht gefunden.",
    });
  });

  it("rejects cross-tenant TeamSeason", async () => {
    mocks.teamSeasonFindFirst.mockResolvedValue(null);

    const result = await addPlayerToTeamSeason({
      tenantId: TENANT_A,
      teamId: "team-b",
      teamSeasonId: "ts-b",
      personId: PERSON_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("TEAM_SEASON_NOT_FOUND");
  });

  it("rejects inactive TeamSeason", async () => {
    mocks.teamSeasonFindFirst.mockResolvedValue({
      ...ACTIVE_TEAM_SEASON,
      status: "ARCHIVED",
    });

    const result = await addPlayerToTeamSeason({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      personId: PERSON_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("TEAM_SEASON_NOT_MUTABLE");
  });

  it("rejects person without player capacity", async () => {
    mocks.personFindFirst.mockResolvedValue({
      ...PLAYER_PERSON,
      isPlayer: false,
    });

    const result = await addPlayerToTeamSeason({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      personId: PERSON_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PERSON_NOT_ELIGIBLE");
  });

  it("allows roster for Person without User", async () => {
    mocks.personFindFirst.mockResolvedValue({ ...PLAYER_PERSON, userId: null });

    const result = await addPlayerToTeamSeason({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      personId: PERSON_ID,
    });

    expect(result.ok).toBe(true);
    expect(mocks.userCreate).not.toHaveBeenCalled();
  });
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01A — addTrainerToTeamSeason", () => {
  it("creates trainer membership and preserves roleLabel", async () => {
    mocks.personFindFirst.mockResolvedValue(TRAINER_PERSON);

    const result = await addTrainerToTeamSeason({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      personId: PERSON_ID,
      roleLabel: "Cheftrainer",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.outcome).toBe("CREATED");
    expect(mocks.trainerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roleLabel: "Cheftrainer" }),
      }),
    );
  });

  it("rejects foreign tenant team season context", async () => {
    mocks.teamSeasonFindFirst.mockResolvedValue(null);
    mocks.personFindFirst.mockResolvedValue(TRAINER_PERSON);

    const result = await addTrainerToTeamSeason({
      tenantId: TENANT_B,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      personId: PERSON_ID,
    });

    expect(result.ok).toBe(false);
  });
});

describe("SCE-PEOPLE-TEAM-ONBOARDING-01A — removals", () => {
  it("removePlayerSquadMembership is tenant scoped", async () => {
    mocks.playerFindFirst.mockResolvedValue({
      id: "psm-1",
      teamSeasonId: TEAM_SEASON_ID,
      personId: PERSON_ID,
      status: "ACTIVE",
      shirtNumber: null,
      positionLabel: null,
      isCaptain: false,
      isViceCaptain: false,
      isWebsiteVisible: true,
      sortOrder: 0,
      remarks: null,
      teamSeason: ACTIVE_TEAM_SEASON,
      person: {
        id: PERSON_ID,
        firstName: "Max",
        lastName: "Muster",
        displayName: null,
        email: null,
        phone: null,
      },
    });

    const result = await removePlayerSquadMembership({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      squadMemberId: "psm-1",
    });

    expect(result.ok).toBe(true);
    expect(mocks.playerDelete).toHaveBeenCalledOnce();
  });

  it("removeTrainerTeamMembership returns not found for foreign ids", async () => {
    mocks.trainerFindFirst.mockResolvedValue(null);

    const result = await removeTrainerTeamMembership({
      tenantId: TENANT_A,
      teamId: TEAM_ID,
      teamSeasonId: TEAM_SEASON_ID,
      trainerMemberId: "missing",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("MEMBERSHIP_NOT_FOUND");
  });
});
