/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01A — draft match squad persistence and candidates.
 */

import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import { structuralPlayerSquadMemberWhere } from "@/lib/teams/player-squad-structural-filter";
import { resolveMatchSquadEventContext } from "@/lib/match-squad/event-context";
import {
  MatchSquadConflictError,
  MatchSquadReadOnlyError,
  MatchSquadValidationError,
} from "@/lib/match-squad/errors";
import type { MatchSquadPlayerPresentation, MatchSquadViewModel } from "@/lib/match-squad/types";

function formatPersonName(input: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}): string {
  return input.displayName?.trim() || `${input.firstName} ${input.lastName}`.trim();
}

function uniquePersonIds(personIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of personIds) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function isMatchCancelledStatus(eventStatus: string): boolean {
  const normalized = eventStatus.trim().toUpperCase();
  return normalized === "CANCELLED" || normalized === "CANCELED";
}

function isMatchSquadEditable(eventStatus: string): { editable: boolean; reason: string | null } {
  if (isMatchCancelledStatus(eventStatus)) {
    return {
      editable: false,
      reason: "Abgesagtes Spiel — Aufgebot ist schreibgeschützt.",
    };
  }
  return { editable: true, reason: null };
}

type RosterRow = {
  personId: string;
  shirtNumber: number | null;
  sortOrder: number;
  person: {
    firstName: string;
    lastName: string;
    displayName: string | null;
  };
};

async function loadActiveRosterRows(teamSeasonId: string, tenantId: string): Promise<RosterRow[]> {
  return prisma.playerSquadMember.findMany({
    where: {
      ...structuralPlayerSquadMemberWhere(teamSeasonId),
      teamSeason: { team: { tenantId } },
    },
    select: {
      personId: true,
      shirtNumber: true,
      sortOrder: true,
      person: {
        select: {
          firstName: true,
          lastName: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { shirtNumber: "asc" }],
  });
}

function toPresentation(
  row: RosterRow,
  options?: { rosterEligible?: boolean },
): MatchSquadPlayerPresentation {
  const rosterEligible = options?.rosterEligible ?? true;
  return {
    personId: row.personId,
    displayName: formatPersonName(row.person),
    shirtNumber: row.shirtNumber,
    sortOrder: row.sortOrder,
    rosterEligible,
    rosterIneligibleLabel: rosterEligible ? null : "Nicht mehr im aktiven Kader",
  };
}

async function loadSelectedPersonIds(matchSquadId: string): Promise<string[]> {
  const rows = await prisma.matchSquadMember.findMany({
    where: { matchSquadId },
    select: { personId: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.personId);
}

export async function getOrCreateDraftMatchSquad(
  tenantId: string,
  eventId: string,
): Promise<{ id: string; updatedAt: Date; teamSeasonId: string }> {
  const context = await resolveMatchSquadEventContext(tenantId, eventId);

  const existing = await prisma.matchSquad.findUnique({
    where: {
      tenantId_eventId: {
        tenantId,
        eventId,
      },
    },
    select: { id: true, updatedAt: true, teamSeasonId: true },
  });

  if (existing) {
    if (existing.teamSeasonId !== context.teamSeasonId) {
      throw new MatchSquadValidationError(
        "Gespeichertes Aufgebot passt nicht zur aufgelösten Team-Saison.",
        "STORED_TEAM_SEASON_MISMATCH",
      );
    }
    return existing;
  }

  const created = await prisma.matchSquad.create({
    data: {
      tenantId,
      eventId: context.eventId,
      teamSeasonId: context.teamSeasonId,
    },
    select: { id: true, updatedAt: true, teamSeasonId: true },
  });

  return created;
}

export async function buildMatchSquadViewModel(
  tenantId: string,
  eventId: string,
): Promise<MatchSquadViewModel> {
  const context = await resolveMatchSquadEventContext(tenantId, eventId);
  const editability = isMatchSquadEditable(context.status);

  const [rosterRows, squad] = await Promise.all([
    loadActiveRosterRows(context.teamSeasonId, tenantId),
    prisma.matchSquad.findUnique({
      where: { tenantId_eventId: { tenantId, eventId } },
      select: { id: true, updatedAt: true, teamSeasonId: true },
    }),
  ]);

  const rosterByPerson = new Map(rosterRows.map((row) => [row.personId, row]));
  const selectedIds = squad ? await loadSelectedPersonIds(squad.id) : [];

  const selected: MatchSquadPlayerPresentation[] = [];
  for (const personId of selectedIds) {
    const rosterRow = rosterByPerson.get(personId);
    if (rosterRow) {
      selected.push(toPresentation(rosterRow, { rosterEligible: true }));
      continue;
    }
    const person = await prisma.person.findFirst({
      where: { id: personId, tenantId },
      select: { id: true, firstName: true, lastName: true, displayName: true },
    });
    if (!person) continue;
    selected.push({
      personId: person.id,
      displayName: formatPersonName(person),
      shirtNumber: null,
      sortOrder: 9999,
      rosterEligible: false,
      rosterIneligibleLabel: "Nicht mehr im aktiven Kader",
    });
  }

  const selectedSet = new Set(selected.map((row) => row.personId));
  const remaining = rosterRows
    .filter((row) => !selectedSet.has(row.personId))
    .map((row) => toPresentation(row));

  return {
    eventId: context.eventId,
    teamId: context.teamId,
    teamSeasonId: context.teamSeasonId,
    teamDisplayName: context.teamDisplayName,
    version: (squad?.updatedAt ?? new Date(0)).toISOString(),
    editable: editability.editable,
    readOnlyReason: editability.reason,
    selected,
    remaining,
    selectedPersonIds: selected.map((row) => row.personId),
    remainingPersonIds: remaining.map((row) => row.personId),
  };
}

export async function setMatchSquadMembers(input: {
  tenantId: string;
  eventId: string;
  actorUserId: string | null;
  desiredPersonIds: string[];
  expectedVersion?: string | null;
}): Promise<MatchSquadViewModel> {
  const context = await resolveMatchSquadEventContext(input.tenantId, input.eventId);
  const editability = isMatchSquadEditable(context.status);
  if (!editability.editable) {
    throw new MatchSquadReadOnlyError(editability.reason ?? undefined);
  }

  const desired = uniquePersonIds(input.desiredPersonIds);
  const rosterRows = await loadActiveRosterRows(context.teamSeasonId, input.tenantId);
  const eligibleIds = new Set(rosterRows.map((row) => row.personId));

  for (const personId of desired) {
    const person = await prisma.person.findFirst({
      where: { id: personId, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!person) {
      throw new MatchSquadValidationError("Unbekannte Person — kann nicht aufgeboten werden.");
    }
    if (!eligibleIds.has(personId)) {
      throw new MatchSquadValidationError(
        "Person ist nicht im aktiven Saison-Kader dieses Teams.",
        "NOT_ACTIVE_ROSTER",
      );
    }
  }

  const squad = await getOrCreateDraftMatchSquad(input.tenantId, input.eventId);
  const beforeIds = await loadSelectedPersonIds(squad.id);

  await prisma.$transaction(async (tx) => {
    if (input.expectedVersion) {
      const expected = new Date(input.expectedVersion);
      if (Number.isNaN(expected.getTime())) {
        throw new MatchSquadValidationError("Ungültige Version.");
      }
      const lock = await tx.matchSquad.updateMany({
        where: { id: squad.id, updatedAt: expected },
        data: { updatedAt: new Date() },
      });
      if (lock.count !== 1) {
        throw new MatchSquadConflictError();
      }
    }

    const currentRows = await tx.matchSquadMember.findMany({
      where: { matchSquadId: squad.id },
      select: { id: true, personId: true },
    });
    const currentIds = new Set(currentRows.map((row) => row.personId));
    const desiredSet = new Set(desired);

    const toRemove = currentRows.filter((row) => !desiredSet.has(row.personId));
    const toAdd = desired.filter((personId) => !currentIds.has(personId));

    if (toRemove.length > 0) {
      await tx.matchSquadMember.deleteMany({
        where: { id: { in: toRemove.map((row) => row.id) } },
      });
    }

    if (toAdd.length > 0) {
      await tx.matchSquadMember.createMany({
        data: toAdd.map((personId) => ({
          matchSquadId: squad.id,
          personId,
        })),
      });
    }

    if (!input.expectedVersion) {
      await tx.matchSquad.update({
        where: { id: squad.id },
        data: { updatedAt: new Date() },
      });
    }
  });

  const afterView = await buildMatchSquadViewModel(input.tenantId, input.eventId);

  void logAction({
    actorUserId: input.actorUserId,
    tenantId: input.tenantId,
    moduleKey: "matchcenter",
    entityType: "MatchSquad",
    entityId: squad.id,
    action: beforeIds.length === 0 ? "CREATE" : "UPDATE",
    beforeJson: { personIds: beforeIds },
    afterJson: { personIds: afterView.selectedPersonIds },
    metadataJson: {
      eventId: input.eventId,
      teamSeasonId: context.teamSeasonId,
      teamId: context.teamId,
    },
  });

  return afterView;
}

/** Product invariant for 01B: remaining roster players are NOT cross-team available. */
export function remainingRosterIsNotCrossTeamAvailability(): true {
  return true;
}
