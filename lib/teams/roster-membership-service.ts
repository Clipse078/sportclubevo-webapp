/**
 * SCE-PEOPLE-TEAM-ONBOARDING-01A — canonical PlayerSquadMember / TrainerTeamMember mutations.
 *
 * Single domain seam for team roster APIs and future onboarding UX (01B).
 * Sporting roster membership is independent of User / TenantMembership / PersonAssignment.
 */

import {
  PlayerSquadStatus,
  Prisma,
  TrainerTeamStatus,
  type TeamSeasonStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { evaluatePlayerBirthYearEligibility } from "@/lib/teams/player-birth-year-eligibility";
import { rosterEligibilityErrorMessage } from "@/lib/teams/roster-eligibility-presentation";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type RosterTeamSeasonContext = {
  id: string;
  teamId: string;
  status: TeamSeasonStatus;
  team: {
    id: string;
    name: string;
    slug: string;
    ageGroup: string | null;
  };
  season: {
    id: string;
    key: string;
    name: string;
    startDate: Date;
  };
};

export type RosterMutationErrorCode =
  | "TEAM_SEASON_NOT_FOUND"
  | "TEAM_SEASON_NOT_MUTABLE"
  | "PERSON_NOT_FOUND"
  | "PERSON_NOT_ELIGIBLE"
  | "JAHRGANG_NOT_ALLOWED"
  | "ALREADY_ACTIVE_MEMBER"
  | "MEMBERSHIP_NOT_FOUND";

export type RosterMembershipOutcome = "CREATED" | "REACTIVATED" | "ALREADY_ACTIVE";

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export type AddPlayerToTeamSeasonInput = {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  personId: string;
  status?: PlayerSquadStatus;
  shirtNumber?: number | null;
  positionLabel?: string | null;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isWebsiteVisible?: boolean;
  sortOrder?: number;
  remarks?: string | null;
};

export type AddPlayerToTeamSeasonResult =
  | {
      ok: true;
      outcome: RosterMembershipOutcome;
      squadMember: PlayerSquadMemberPayload;
      teamSeason: RosterTeamSeasonContext;
      personSummary: PersonPlayerSummary;
      jahrgang?: { allowedBirthYears: number[]; birthYear: number | null };
    }
  | { ok: false; code: RosterMutationErrorCode; message: string };

export type PlayerSquadMemberPayload = {
  id: string;
  status: PlayerSquadStatus;
  shirtNumber: number | null;
  positionLabel: string | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isWebsiteVisible: boolean;
  sortOrder: number;
  remarks: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    dateOfBirth: Date | null;
  };
};

type PersonPlayerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | null;
  isActive: boolean;
  isPlayer: boolean;
};

const PLAYER_SQUAD_MEMBER_SELECT = {
  id: true,
  status: true,
  shirtNumber: true,
  positionLabel: true,
  isCaptain: true,
  isViceCaptain: true,
  isWebsiteVisible: true,
  sortOrder: true,
  remarks: true,
  person: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
    },
  },
} satisfies Prisma.PlayerSquadMemberSelect;

function playerMembershipIsReactivatable(status: PlayerSquadStatus): boolean {
  return status === "INACTIVE" || status === "ARCHIVED";
}

async function loadTeamSeasonForRoster(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
}): Promise<RosterTeamSeasonContext | null> {
  const row = await prisma.teamSeason.findFirst({
    where: {
      id: input.teamSeasonId,
      teamId: input.teamId,
      team: { tenantId: input.tenantId },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          ageGroup: true,
        },
      },
      season: {
        select: {
          id: true,
          key: true,
          name: true,
          startDate: true,
        },
      },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    teamId: row.teamId,
    status: row.status,
    team: row.team,
    season: row.season,
  };
}

function assertTeamSeasonMutable(
  teamSeason: RosterTeamSeasonContext,
): { ok: true } | { ok: false; code: "TEAM_SEASON_NOT_MUTABLE"; message: string } {
  if (teamSeason.status !== "ACTIVE") {
    return {
      ok: false,
      code: "TEAM_SEASON_NOT_MUTABLE",
      message: "Kaderänderungen sind für diese Team-Saison nicht möglich (Status nicht aktiv).",
    };
  }
  return { ok: true };
}

export async function addPlayerToTeamSeason(
  input: AddPlayerToTeamSeasonInput,
): Promise<AddPlayerToTeamSeasonResult> {
  const teamSeason = await loadTeamSeasonForRoster(input);
  if (!teamSeason) {
    return {
      ok: false,
      code: "TEAM_SEASON_NOT_FOUND",
      message: "Team-Saison nicht gefunden.",
    };
  }

  const mutable = assertTeamSeasonMutable(teamSeason);
  if (!mutable.ok) {
    return mutable;
  }

  const person = await prisma.person.findFirst({
    where: { id: input.personId, tenantId: input.tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      isActive: true,
      isPlayer: true,
    },
  });

  if (!person) {
    return {
      ok: false,
      code: "PERSON_NOT_FOUND",
      message: "Person nicht gefunden.",
    };
  }

  if (!person.isActive || !person.isPlayer) {
    return {
      ok: false,
      code: "PERSON_NOT_ELIGIBLE",
      message: "Diese Person ist kein aktiver Spieler.",
    };
  }

  const jahrgangCheck = evaluatePlayerBirthYearEligibility({
    categoryCode: teamSeason.team.ageGroup,
    seasonStartDate: teamSeason.season.startDate,
    birthDate: person.dateOfBirth,
  });

  if (!jahrgangCheck.ok) {
    return {
      ok: false,
      code: "JAHRGANG_NOT_ALLOWED",
      message: rosterEligibilityErrorMessage({
        kind: jahrgangCheck.kind,
        allowedBirthYears: jahrgangCheck.allowedBirthYears,
        birthYear: jahrgangCheck.birthYear,
      }),
    };
  }

  const status = input.status ?? PlayerSquadStatus.ACTIVE;

  const existing = await prisma.playerSquadMember.findUnique({
    where: {
      teamSeasonId_personId: {
        teamSeasonId: input.teamSeasonId,
        personId: input.personId,
      },
    },
    select: PLAYER_SQUAD_MEMBER_SELECT,
  });

  if (existing) {
    if (playerMembershipIsReactivatable(existing.status)) {
      const updated = await prisma.playerSquadMember.update({
        where: { id: existing.id },
        data: {
          status,
          shirtNumber: input.shirtNumber ?? null,
          positionLabel: input.positionLabel ?? null,
          isCaptain: input.isCaptain ?? false,
          isViceCaptain: input.isViceCaptain ?? false,
          isWebsiteVisible: input.isWebsiteVisible ?? true,
          sortOrder: input.sortOrder ?? 0,
          remarks: input.remarks ?? null,
        },
        select: PLAYER_SQUAD_MEMBER_SELECT,
      });
      return {
        ok: true,
        outcome: "REACTIVATED",
        squadMember: updated,
        teamSeason,
        personSummary: person,
        jahrgang: {
          allowedBirthYears: jahrgangCheck.allowedBirthYears,
          birthYear: jahrgangCheck.birthYear,
        },
      };
    }

    return {
      ok: true,
      outcome: "ALREADY_ACTIVE",
      squadMember: existing,
      teamSeason,
      personSummary: person,
      jahrgang: {
        allowedBirthYears: jahrgangCheck.allowedBirthYears,
        birthYear: jahrgangCheck.birthYear,
      },
    };
  }

  const created = await prisma.playerSquadMember.create({
    data: {
      teamSeasonId: input.teamSeasonId,
      personId: input.personId,
      status,
      shirtNumber: input.shirtNumber ?? null,
      positionLabel: input.positionLabel ?? null,
      isCaptain: input.isCaptain ?? false,
      isViceCaptain: input.isViceCaptain ?? false,
      isWebsiteVisible: input.isWebsiteVisible ?? true,
      sortOrder: input.sortOrder ?? 0,
      remarks: input.remarks ?? null,
    },
    select: PLAYER_SQUAD_MEMBER_SELECT,
  });

  return {
    ok: true,
    outcome: "CREATED",
    squadMember: created,
    teamSeason,
    personSummary: person,
    jahrgang: {
      allowedBirthYears: jahrgangCheck.allowedBirthYears,
      birthYear: jahrgangCheck.birthYear,
    },
  };
}

export type RemovePlayerSquadMembershipInput = {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  squadMemberId: string;
};

export type RemovePlayerSquadMembershipResult =
  | {
      ok: true;
      removed: {
        id: string;
        teamSeasonId: string;
        personId: string;
        status: PlayerSquadStatus;
        shirtNumber: number | null;
        positionLabel: string | null;
        isCaptain: boolean;
        isViceCaptain: boolean;
        isWebsiteVisible: boolean;
        sortOrder: number;
        remarks: string | null;
        person: {
          id: string;
          firstName: string;
          lastName: string;
          displayName: string | null;
          email: string | null;
          phone: string | null;
        };
        teamSeason: RosterTeamSeasonContext;
      };
    }
  | { ok: false; code: RosterMutationErrorCode; message: string };

export async function removePlayerSquadMembership(
  input: RemovePlayerSquadMembershipInput,
): Promise<RemovePlayerSquadMembershipResult> {
  const existing = await prisma.playerSquadMember.findFirst({
    where: {
      id: input.squadMemberId,
      teamSeasonId: input.teamSeasonId,
      teamSeason: { teamId: input.teamId, team: { tenantId: input.tenantId } },
      person: { tenantId: input.tenantId },
    },
    include: {
      teamSeason: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              ageGroup: true,
            },
          },
          season: {
            select: {
              id: true,
              key: true,
              name: true,
              startDate: true,
            },
          },
        },
      },
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!existing) {
    return {
      ok: false,
      code: "MEMBERSHIP_NOT_FOUND",
      message: "Kader-Eintrag nicht gefunden.",
    };
  }

  await prisma.playerSquadMember.delete({
    where: {
      id: input.squadMemberId,
      teamSeason: { teamId: input.teamId, team: { tenantId: input.tenantId } },
      person: { tenantId: input.tenantId },
    },
  });

  const teamSeason: RosterTeamSeasonContext = {
    id: existing.teamSeason.id,
    teamId: existing.teamSeason.teamId,
    status: existing.teamSeason.status,
    team: existing.teamSeason.team,
    season: existing.teamSeason.season,
  };

  return {
    ok: true,
    removed: {
      id: existing.id,
      teamSeasonId: existing.teamSeasonId,
      personId: existing.personId,
      status: existing.status,
      shirtNumber: existing.shirtNumber,
      positionLabel: existing.positionLabel,
      isCaptain: existing.isCaptain,
      isViceCaptain: existing.isViceCaptain,
      isWebsiteVisible: existing.isWebsiteVisible,
      sortOrder: existing.sortOrder,
      remarks: existing.remarks,
      person: existing.person,
      teamSeason,
    },
  };
}

// ---------------------------------------------------------------------------
// Trainer
// ---------------------------------------------------------------------------

export type AddTrainerToTeamSeasonInput = {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  personId: string;
  status?: TrainerTeamStatus;
  roleLabel?: string | null;
  isWebsiteVisible?: boolean;
  sortOrder?: number;
  remarks?: string | null;
};

export type TrainerTeamMemberPayload = {
  id: string;
  status: TrainerTeamStatus;
  roleLabel: string | null;
  isWebsiteVisible: boolean;
  sortOrder: number;
  remarks: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
  };
};

export type AddTrainerToTeamSeasonResult =
  | {
      ok: true;
      outcome: RosterMembershipOutcome;
      trainerMember: TrainerTeamMemberPayload;
      teamSeason: RosterTeamSeasonContext;
      personSummary: {
        id: string;
        firstName: string;
        lastName: string;
        displayName: string | null;
        isActive: boolean;
        isTrainer: boolean;
      };
    }
  | { ok: false; code: RosterMutationErrorCode; message: string };

const TRAINER_TEAM_MEMBER_SELECT = {
  id: true,
  status: true,
  roleLabel: true,
  isWebsiteVisible: true,
  sortOrder: true,
  remarks: true,
  person: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      email: true,
      phone: true,
    },
  },
} satisfies Prisma.TrainerTeamMemberSelect;

function trainerMembershipIsReactivatable(status: TrainerTeamStatus): boolean {
  return status === "INACTIVE" || status === "ARCHIVED";
}

export async function addTrainerToTeamSeason(
  input: AddTrainerToTeamSeasonInput,
): Promise<AddTrainerToTeamSeasonResult> {
  const teamSeason = await loadTeamSeasonForRoster(input);
  if (!teamSeason) {
    return {
      ok: false,
      code: "TEAM_SEASON_NOT_FOUND",
      message: "Team-Saison nicht gefunden.",
    };
  }

  const mutable = assertTeamSeasonMutable(teamSeason);
  if (!mutable.ok) {
    return mutable;
  }

  const person = await prisma.person.findFirst({
    where: { id: input.personId, tenantId: input.tenantId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      isActive: true,
      isTrainer: true,
    },
  });

  if (!person) {
    return {
      ok: false,
      code: "PERSON_NOT_FOUND",
      message: "Person nicht gefunden.",
    };
  }

  if (!person.isActive || !person.isTrainer) {
    return {
      ok: false,
      code: "PERSON_NOT_ELIGIBLE",
      message: "Diese Person ist kein aktiver Trainer.",
    };
  }

  const status = input.status ?? TrainerTeamStatus.ACTIVE;

  const existing = await prisma.trainerTeamMember.findUnique({
    where: {
      teamSeasonId_personId: {
        teamSeasonId: input.teamSeasonId,
        personId: input.personId,
      },
    },
    select: TRAINER_TEAM_MEMBER_SELECT,
  });

  if (existing) {
    if (trainerMembershipIsReactivatable(existing.status)) {
      const updated = await prisma.trainerTeamMember.update({
        where: { id: existing.id },
        data: {
          status,
          roleLabel: input.roleLabel ?? existing.roleLabel,
          isWebsiteVisible: input.isWebsiteVisible ?? true,
          sortOrder: input.sortOrder ?? 0,
          remarks: input.remarks ?? null,
        },
        select: TRAINER_TEAM_MEMBER_SELECT,
      });
      return {
        ok: true,
        outcome: "REACTIVATED",
        trainerMember: updated,
        teamSeason,
        personSummary: person,
      };
    }

    return {
      ok: true,
      outcome: "ALREADY_ACTIVE",
      trainerMember: existing,
      teamSeason,
      personSummary: person,
    };
  }

  const created = await prisma.trainerTeamMember.create({
    data: {
      teamSeasonId: input.teamSeasonId,
      personId: input.personId,
      status,
      roleLabel: input.roleLabel ?? null,
      isWebsiteVisible: input.isWebsiteVisible ?? true,
      sortOrder: input.sortOrder ?? 0,
      remarks: input.remarks ?? null,
    },
    select: TRAINER_TEAM_MEMBER_SELECT,
  });

  return {
    ok: true,
    outcome: "CREATED",
    trainerMember: created,
    teamSeason,
    personSummary: person,
  };
}

export type RemoveTrainerTeamMembershipInput = {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  trainerMemberId: string;
};

export type RemoveTrainerTeamMembershipResult =
  | {
      ok: true;
      removed: {
        id: string;
        teamSeasonId: string;
        personId: string;
        status: TrainerTeamStatus;
        roleLabel: string | null;
        isWebsiteVisible: boolean;
        sortOrder: number;
        remarks: string | null;
        person: {
          firstName: string;
          lastName: string;
          displayName: string | null;
        };
      };
    }
  | { ok: false; code: RosterMutationErrorCode; message: string };

export async function removeTrainerTeamMembership(
  input: RemoveTrainerTeamMembershipInput,
): Promise<RemoveTrainerTeamMembershipResult> {
  const existing = await prisma.trainerTeamMember.findFirst({
    where: {
      id: input.trainerMemberId,
      teamSeasonId: input.teamSeasonId,
      teamSeason: { teamId: input.teamId, team: { tenantId: input.tenantId } },
      person: { tenantId: input.tenantId },
    },
    select: {
      id: true,
      teamSeasonId: true,
      personId: true,
      status: true,
      roleLabel: true,
      isWebsiteVisible: true,
      sortOrder: true,
      remarks: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
        },
      },
    },
  });

  if (!existing) {
    return {
      ok: false,
      code: "MEMBERSHIP_NOT_FOUND",
      message: "Trainerteam-Eintrag nicht gefunden.",
    };
  }

  await prisma.trainerTeamMember.delete({
    where: {
      id: input.trainerMemberId,
      teamSeason: { teamId: input.teamId, team: { tenantId: input.tenantId } },
      person: { tenantId: input.tenantId },
    },
  });

  return { ok: true, removed: existing };
}
