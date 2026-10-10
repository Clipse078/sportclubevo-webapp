/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01C — canonical Spielerfreigabe domain service.
 */

import {
  PlayerReleaseReason,
  PlayerReleaseStatus,
  Prisma,
  type TeamSeasonStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import { currentSeasonRosterPlayerSquadMemberWhere } from "@/lib/teams/player-squad-structural-filter";
import { formatPersonName } from "@/lib/communication/personalisation/formatters";
import {
  PlayerReleaseConflictError,
  PlayerReleaseNotFoundError,
  PlayerReleaseOverlapError,
  PlayerReleaseValidationError,
} from "@/lib/match-squad/player-release-errors";
import {
  dateRangesOverlap,
  isPlayerReleaseOperationallyActive,
  resolvePlayerReleaseDisplayState,
} from "@/lib/match-squad/player-release-lifecycle";
import {
  formatMaxMinutesLabel,
  formatReleaseValidityRange,
  playerReleaseReasonLabel,
} from "@/lib/match-squad/player-release-presentation";

const MAX_MINUTES_HARD_CAP = 120;

const releaseSelect = {
  id: true,
  tenantId: true,
  personId: true,
  sourceTeamSeasonId: true,
  targetTeamSeasonId: true,
  validFrom: true,
  validUntil: true,
  maxMinutes: true,
  reason: true,
  note: true,
  status: true,
  revokedAt: true,
  revokedByUserId: true,
  createdByUserId: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
  person: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
    },
  },
  sourceTeamSeason: {
    select: {
      id: true,
      displayName: true,
      shortName: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
  },
  targetTeamSeason: {
    select: {
      id: true,
      displayName: true,
      shortName: true,
      status: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
  },
} satisfies Prisma.PlayerReleaseSelect;

export type PlayerReleaseRow = Prisma.PlayerReleaseGetPayload<{ select: typeof releaseSelect }>;

export type PlayerReleaseListItem = {
  id: string;
  personId: string;
  personDisplayName: string;
  sourceTeamSeasonId: string;
  sourceTeamLabel: string;
  targetTeamSeasonId: string;
  targetTeamLabel: string;
  validFrom: string;
  validUntil: string;
  validityLabel: string;
  maxMinutes: number | null;
  maxMinutesLabel: string;
  reason: PlayerReleaseReason;
  reasonLabel: string;
  note: string | null;
  status: PlayerReleaseStatus;
  displayPhase: string;
  displayLabel: string;
  operationallyActive: boolean;
  sourceRosterMember: boolean;
  updatedAt: string;
  version: string;
};

export type PlayerReleaseTargetOption = {
  teamSeasonId: string;
  label: string;
  teamId: string;
};

export type PlayerReleaseRosterPlayerOption = {
  personId: string;
  displayName: string;
};

function parseCalendarDateInput(value: string, fieldLabel: string): Date {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new PlayerReleaseValidationError(`${fieldLabel} muss im Format JJJJ-MM-TT sein.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new PlayerReleaseValidationError(`${fieldLabel} ist ungültig.`);
  }
  return date;
}

function parseReason(value: string): PlayerReleaseReason {
  const normalized = value.trim().toUpperCase();
  const allowed = Object.values(PlayerReleaseReason);
  if (!allowed.includes(normalized as PlayerReleaseReason)) {
    throw new PlayerReleaseValidationError("Bitte einen gültigen Freigabe-Grund wählen.");
  }
  return normalized as PlayerReleaseReason;
}

function parseMaxMinutes(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    throw new PlayerReleaseValidationError(
      "Max. Einsatzzeit muss eine ganze Zahl grösser als 0 sein oder leer bleiben.",
    );
  }
  if (num > MAX_MINUTES_HARD_CAP) {
    throw new PlayerReleaseValidationError(
      `Max. Einsatzzeit darf ${MAX_MINUTES_HARD_CAP} Minuten nicht überschreiten.`,
    );
  }
  return num;
}

function teamSeasonLabel(row: {
  displayName: string;
  shortName: string | null;
  team: { name: string; shortName: string | null };
}): string {
  return row.displayName || row.shortName || row.team.shortName || row.team.name;
}

function mapReleaseRow(
  row: PlayerReleaseRow,
  input: {
    timezone: string;
    sourceRosterPersonIds: Set<string>;
  },
): PlayerReleaseListItem {
  const display = resolvePlayerReleaseDisplayState({
    status: row.status,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    timezone: input.timezone,
  });

  return {
    id: row.id,
    personId: row.personId,
    personDisplayName: formatPersonName(row.person),
    sourceTeamSeasonId: row.sourceTeamSeasonId,
    sourceTeamLabel: teamSeasonLabel(row.sourceTeamSeason),
    targetTeamSeasonId: row.targetTeamSeasonId,
    targetTeamLabel: teamSeasonLabel(row.targetTeamSeason),
    validFrom: row.validFrom.toISOString().slice(0, 10),
    validUntil: row.validUntil.toISOString().slice(0, 10),
    validityLabel: formatReleaseValidityRange(row.validFrom, row.validUntil),
    maxMinutes: row.maxMinutes,
    maxMinutesLabel: formatMaxMinutesLabel(row.maxMinutes),
    reason: row.reason,
    reasonLabel: playerReleaseReasonLabel(row.reason),
    note: row.note,
    status: row.status,
    displayPhase: display.phase,
    displayLabel: display.label,
    operationallyActive: isPlayerReleaseOperationallyActive({
      status: row.status,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      timezone: input.timezone,
    }),
    sourceRosterMember: input.sourceRosterPersonIds.has(row.personId),
    updatedAt: row.updatedAt.toISOString(),
    version: row.updatedAt.toISOString(),
  };
}

async function loadSourceTeamSeasonContext(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
}): Promise<{
  id: string;
  seasonId: string;
  status: TeamSeasonStatus;
}> {
  const teamSeason = await prisma.teamSeason.findFirst({
    where: {
      id: input.teamSeasonId,
      teamId: input.teamId,
      team: { tenantId: input.tenantId },
    },
    select: { id: true, seasonId: true, status: true },
  });
  if (!teamSeason) {
    throw new PlayerReleaseValidationError("Team-Saison nicht gefunden.", "TEAM_SEASON_NOT_FOUND");
  }
  return teamSeason;
}

async function assertStructuralRosterMember(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  personId: string;
}): Promise<void> {
  const member = await prisma.playerSquadMember.findFirst({
    where: {
      ...currentSeasonRosterPlayerSquadMemberWhere(input.sourceTeamSeasonId),
      personId: input.personId,
      person: { tenantId: input.tenantId },
    },
    select: { id: true },
  });
  if (!member) {
    throw new PlayerReleaseValidationError(
      "Spieler ist nicht im aktuellen Saison-Kader des Stammteams.",
      "NOT_ROSTER_MEMBER",
    );
  }
}

async function assertTargetTeamSeason(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  sourceSeasonId: string;
  targetTeamSeasonId: string;
}): Promise<void> {
  if (input.targetTeamSeasonId === input.sourceTeamSeasonId) {
    throw new PlayerReleaseValidationError(
      "Zielteam muss ein anderes Team als das Stammteam sein.",
      "SAME_TARGET",
    );
  }

  const target = await prisma.teamSeason.findFirst({
    where: {
      id: input.targetTeamSeasonId,
      seasonId: input.sourceSeasonId,
      status: "ACTIVE",
      team: { tenantId: input.tenantId },
    },
    select: { id: true },
  });
  if (!target) {
    throw new PlayerReleaseValidationError(
      "Zielteam ist für diese Saison nicht verfügbar.",
      "INVALID_TARGET",
    );
  }
}

async function assertNoOverlappingActiveRelease(input: {
  tenantId: string;
  personId: string;
  sourceTeamSeasonId: string;
  targetTeamSeasonId: string;
  validFrom: Date;
  validUntil: Date;
  excludeReleaseId?: string;
}): Promise<void> {
  const candidates = await prisma.playerRelease.findMany({
    where: {
      tenantId: input.tenantId,
      personId: input.personId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      status: "ACTIVE",
      ...(input.excludeReleaseId ? { id: { not: input.excludeReleaseId } } : {}),
    },
    select: { id: true, validFrom: true, validUntil: true },
  });

  for (const candidate of candidates) {
    if (
      dateRangesOverlap(
        input.validFrom,
        input.validUntil,
        candidate.validFrom,
        candidate.validUntil,
      )
    ) {
      throw new PlayerReleaseOverlapError();
    }
  }
}

export async function listTargetTeamSeasonOptions(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  sourceSeasonId: string;
}): Promise<PlayerReleaseTargetOption[]> {
  const rows = await prisma.teamSeason.findMany({
    where: {
      id: { not: input.sourceTeamSeasonId },
      seasonId: input.sourceSeasonId,
      status: "ACTIVE",
      team: { tenantId: input.tenantId },
    },
    select: {
      id: true,
      displayName: true,
      shortName: true,
      team: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: [{ team: { name: "asc" } }, { displayName: "asc" }],
  });

  return rows.map((row) => ({
    teamSeasonId: row.id,
    teamId: row.team.id,
    label: teamSeasonLabel(row),
  }));
}

export async function listRosterPlayerOptions(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
}): Promise<PlayerReleaseRosterPlayerOption[]> {
  const rows = await prisma.playerSquadMember.findMany({
    where: {
      ...currentSeasonRosterPlayerSquadMemberWhere(input.sourceTeamSeasonId),
      person: { tenantId: input.tenantId },
    },
    select: {
      personId: true,
      sortOrder: true,
      person: {
        select: { firstName: true, lastName: true, displayName: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { person: { lastName: "asc" } }],
  });

  return rows.map((row) => ({
    personId: row.personId,
    displayName: formatPersonName(row.person),
  }));
}

export async function listPlayerReleasesForSourceTeamSeason(input: {
  tenantId: string;
  teamId: string;
  sourceTeamSeasonId: string;
  timezone: string;
  includeHistory?: boolean;
}): Promise<{ releases: PlayerReleaseListItem[]; rosterPlayers: PlayerReleaseRosterPlayerOption[]; targetOptions: PlayerReleaseTargetOption[] }> {
  const source = await loadSourceTeamSeasonContext({
    tenantId: input.tenantId,
    teamId: input.teamId,
    teamSeasonId: input.sourceTeamSeasonId,
  });

  const rosterRows = await prisma.playerSquadMember.findMany({
    where: currentSeasonRosterPlayerSquadMemberWhere(input.sourceTeamSeasonId),
    select: { personId: true },
  });
  const rosterIds = new Set(rosterRows.map((row) => row.personId));

  const rows = await prisma.playerRelease.findMany({
    where: {
      tenantId: input.tenantId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      ...(input.includeHistory
        ? {}
        : {
            OR: [
              { status: "ACTIVE" },
              {
                status: "REVOKED",
                revokedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
              },
            ],
          }),
    },
    select: releaseSelect,
    orderBy: [
      { person: { lastName: "asc" } },
      { targetTeamSeason: { displayName: "asc" } },
      { validFrom: "desc" },
    ],
  });

  const mapped = rows.map((row) =>
    mapReleaseRow(row, { timezone: input.timezone, sourceRosterPersonIds: rosterIds }),
  );

  const releases = input.includeHistory
    ? mapped
    : mapped.filter(
        (row) =>
          row.operationallyActive ||
          row.displayPhase === "UPCOMING" ||
          row.status === "REVOKED",
      );

  const [rosterPlayers, targetOptions] = await Promise.all([
    listRosterPlayerOptions({
      tenantId: input.tenantId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
    }),
    listTargetTeamSeasonOptions({
      tenantId: input.tenantId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      sourceSeasonId: source.seasonId,
    }),
  ]);

  return { releases, rosterPlayers, targetOptions };
}

export async function createPlayerRelease(input: {
  tenantId: string;
  teamId: string;
  sourceTeamSeasonId: string;
  actorUserId: string;
  personId: string;
  targetTeamSeasonId: string;
  validFrom: string;
  validUntil: string;
  maxMinutes?: unknown;
  reason: string;
  note?: string | null;
}): Promise<PlayerReleaseListItem> {
  const source = await loadSourceTeamSeasonContext({
    tenantId: input.tenantId,
    teamId: input.teamId,
    teamSeasonId: input.sourceTeamSeasonId,
  });

  const personId = input.personId.trim();
  if (!personId) {
    throw new PlayerReleaseValidationError("Bitte einen Spieler wählen.");
  }

  const validFrom = parseCalendarDateInput(input.validFrom, "Gültig ab");
  const validUntil = parseCalendarDateInput(input.validUntil, "Gültig bis");
  if (validFrom.getTime() > validUntil.getTime()) {
    throw new PlayerReleaseValidationError(
      "«Gültig ab» darf nicht nach «Gültig bis» liegen.",
      "INVALID_DATE_RANGE",
    );
  }

  const maxMinutes = parseMaxMinutes(input.maxMinutes);
  const reason = parseReason(input.reason);
  const note =
    input.note === null || input.note === undefined ? null : String(input.note).trim() || null;

  await assertStructuralRosterMember({
    tenantId: input.tenantId,
    sourceTeamSeasonId: input.sourceTeamSeasonId,
    personId,
  });

  await assertTargetTeamSeason({
    tenantId: input.tenantId,
    sourceTeamSeasonId: input.sourceTeamSeasonId,
    sourceSeasonId: source.seasonId,
    targetTeamSeasonId: input.targetTeamSeasonId,
  });

  await assertNoOverlappingActiveRelease({
    tenantId: input.tenantId,
    personId,
    sourceTeamSeasonId: input.sourceTeamSeasonId,
    targetTeamSeasonId: input.targetTeamSeasonId,
    validFrom,
    validUntil,
  });

  const created = await prisma.playerRelease.create({
    data: {
      tenantId: input.tenantId,
      personId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      validFrom,
      validUntil,
      maxMinutes,
      reason,
      note,
      status: "ACTIVE",
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    },
    select: releaseSelect,
  });

  void logAction({
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    moduleKey: "teams",
    entityType: "PlayerRelease",
    entityId: created.id,
    action: "CREATE",
    afterJson: {
      personId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      validFrom: created.validFrom,
      validUntil: created.validUntil,
      maxMinutes,
      reason,
    },
  });

  const rosterIds = new Set([personId]);
  return mapReleaseRow(created, {
    timezone: "Europe/Zurich",
    sourceRosterPersonIds: rosterIds,
  });
}

export async function updatePlayerRelease(input: {
  tenantId: string;
  teamId: string;
  sourceTeamSeasonId: string;
  releaseId: string;
  actorUserId: string;
  validFrom?: string;
  validUntil?: string;
  maxMinutes?: unknown;
  reason?: string;
  note?: string | null;
  expectedVersion?: string | null;
}): Promise<PlayerReleaseListItem> {
  const existing = await prisma.playerRelease.findFirst({
    where: {
      id: input.releaseId,
      tenantId: input.tenantId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      sourceTeamSeason: { teamId: input.teamId },
    },
    select: releaseSelect,
  });
  if (!existing) {
    throw new PlayerReleaseNotFoundError();
  }
  if (existing.status !== "ACTIVE") {
    throw new PlayerReleaseValidationError("Nur aktive Freigaben können bearbeitet werden.");
  }

  const validFrom = input.validFrom
    ? parseCalendarDateInput(input.validFrom, "Gültig ab")
    : existing.validFrom;
  const validUntil = input.validUntil
    ? parseCalendarDateInput(input.validUntil, "Gültig bis")
    : existing.validUntil;
  if (validFrom.getTime() > validUntil.getTime()) {
    throw new PlayerReleaseValidationError(
      "«Gültig ab» darf nicht nach «Gültig bis» liegen.",
      "INVALID_DATE_RANGE",
    );
  }

  const maxMinutes =
    input.maxMinutes !== undefined ? parseMaxMinutes(input.maxMinutes) : existing.maxMinutes;
  const reason = input.reason ? parseReason(input.reason) : existing.reason;
  const note =
    input.note !== undefined
      ? input.note === null
        ? null
        : String(input.note).trim() || null
      : existing.note;

  await assertNoOverlappingActiveRelease({
    tenantId: input.tenantId,
    personId: existing.personId,
    sourceTeamSeasonId: existing.sourceTeamSeasonId,
    targetTeamSeasonId: existing.targetTeamSeasonId,
    validFrom,
    validUntil,
    excludeReleaseId: existing.id,
  });

  if (input.expectedVersion) {
    const expected = new Date(input.expectedVersion);
    if (Number.isNaN(expected.getTime())) {
      throw new PlayerReleaseValidationError("Ungültige Version.");
    }
    const lock = await prisma.playerRelease.updateMany({
      where: { id: existing.id, updatedAt: expected, status: "ACTIVE" },
      data: {
        validFrom,
        validUntil,
        maxMinutes,
        reason,
        note,
        updatedByUserId: input.actorUserId,
        updatedAt: new Date(),
      },
    });
    if (lock.count !== 1) {
      throw new PlayerReleaseConflictError();
    }
  } else {
    await prisma.playerRelease.update({
      where: { id: existing.id },
      data: {
        validFrom,
        validUntil,
        maxMinutes,
        reason,
        note,
        updatedByUserId: input.actorUserId,
      },
    });
  }

  const updated = await prisma.playerRelease.findFirstOrThrow({
    where: { id: existing.id },
    select: releaseSelect,
  });

  void logAction({
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    moduleKey: "teams",
    entityType: "PlayerRelease",
    entityId: updated.id,
    action: "UPDATE",
    beforeJson: {
      validFrom: existing.validFrom,
      validUntil: existing.validUntil,
      maxMinutes: existing.maxMinutes,
      reason: existing.reason,
      note: existing.note,
    },
    afterJson: {
      validFrom: updated.validFrom,
      validUntil: updated.validUntil,
      maxMinutes: updated.maxMinutes,
      reason: updated.reason,
      note: updated.note,
    },
  });

  const rosterMember = await prisma.playerSquadMember.findFirst({
    where: {
      ...currentSeasonRosterPlayerSquadMemberWhere(input.sourceTeamSeasonId),
      personId: updated.personId,
    },
    select: { personId: true },
  });

  return mapReleaseRow(updated, {
    timezone: "Europe/Zurich",
    sourceRosterPersonIds: new Set(rosterMember ? [updated.personId] : []),
  });
}

export async function revokePlayerRelease(input: {
  tenantId: string;
  teamId: string;
  sourceTeamSeasonId: string;
  releaseId: string;
  actorUserId: string;
}): Promise<PlayerReleaseListItem> {
  const existing = await prisma.playerRelease.findFirst({
    where: {
      id: input.releaseId,
      tenantId: input.tenantId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      sourceTeamSeason: { teamId: input.teamId },
    },
    select: releaseSelect,
  });
  if (!existing) {
    throw new PlayerReleaseNotFoundError();
  }
  if (existing.status === "REVOKED") {
    throw new PlayerReleaseValidationError("Diese Freigabe ist bereits widerrufen.");
  }

  const revoked = await prisma.playerRelease.update({
    where: { id: existing.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokedByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    },
    select: releaseSelect,
  });

  void logAction({
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    moduleKey: "teams",
    entityType: "PlayerRelease",
    entityId: revoked.id,
    action: "UPDATE",
    beforeJson: { status: existing.status },
    afterJson: { status: "REVOKED" },
  });

  const rosterMember = await prisma.playerSquadMember.findFirst({
    where: {
      ...currentSeasonRosterPlayerSquadMemberWhere(input.sourceTeamSeasonId),
      personId: revoked.personId,
    },
    select: { personId: true },
  });

  return mapReleaseRow(revoked, {
    timezone: "Europe/Zurich",
    sourceRosterPersonIds: new Set(rosterMember ? [revoked.personId] : []),
  });
}

/** Pure boundary marker — release domain must never mutate availability or match squad. */
export const PLAYER_RELEASE_SIGNAL_BOUNDARIES = {
  doesNotMutateParticipationResponse: true,
  doesNotMutateMatchSquadMember: true,
  matchSquadSelectionDoesNotBlockRelease: true,
  availabilityDoesNotCreateOrRevokeRelease: true,
} as const;
