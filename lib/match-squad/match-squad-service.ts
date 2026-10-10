/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01A — draft match squad persistence and candidates.
 */

import { prisma } from "@/lib/db/prisma";
import { logAction } from "@/lib/audit/log-action";
import { currentSeasonRosterPlayerSquadMemberWhere } from "@/lib/teams/player-squad-structural-filter";
import {
  canRemoveFromMatchSquad,
  canSelectForMatchSquad,
  hasMatchAvailabilityConflict,
  mapParticipationStatusToMatchAvailability,
} from "@/lib/match-squad/availability-adapter";
import { getMatchParticipationStatusPresentation } from "@/lib/match-squad/match-availability-presentation";
import type {
  ParticipationResponseSource,
  ParticipationResponseStatus,
  PlayerSquadStatus,
} from "@prisma/client";
import { getParticipationResponseProvenanceLabel } from "@/lib/match-squad/participation-provenance-labels";
import type {
  MatchSquadCounts,
  MatchSquadPlayerPresentation,
  MatchSquadViewModel,
} from "@/lib/match-squad/types";
import { resolveMatchSquadEventContext } from "@/lib/match-squad/event-context";
import {
  MatchSquadConflictError,
  MatchSquadReadOnlyError,
  MatchSquadValidationError,
} from "@/lib/match-squad/errors";

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
  status: PlayerSquadStatus;
  person: {
    firstName: string;
    lastName: string;
    displayName: string | null;
  };
};

type ParticipationRow = {
  personId: string;
  status: ParticipationResponseStatus;
  note: string | null;
  responseSource: ParticipationResponseSource | null;
};

async function loadCurrentRosterRows(teamSeasonId: string, tenantId: string): Promise<RosterRow[]> {
  return prisma.playerSquadMember.findMany({
    where: {
      ...currentSeasonRosterPlayerSquadMemberWhere(teamSeasonId),
      teamSeason: { team: { tenantId } },
    },
    select: {
      personId: true,
      shirtNumber: true,
      sortOrder: true,
      status: true,
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

async function loadParticipationByPerson(
  tenantId: string,
  eventId: string,
  personIds: string[],
): Promise<Map<string, ParticipationRow>> {
  if (personIds.length === 0) {
    return new Map();
  }
  const rows = await prisma.participationResponse.findMany({
    where: {
      tenantId,
      eventId,
      eventKind: "MATCH",
      personId: { in: personIds },
    },
    select: {
      personId: true,
      status: true,
      note: true,
      responseSource: true,
    },
  });
  return new Map(rows.map((row) => [row.personId, row]));
}

function buildPlayerPresentation(input: {
  personId: string;
  displayName: string;
  shirtNumber: number | null;
  sortOrder: number;
  rosterEligible: boolean;
  rosterStatus: PlayerSquadStatus | null;
  participation: ParticipationRow | undefined;
  selected: boolean;
  editable: boolean;
}): MatchSquadPlayerPresentation {
  const availability = mapParticipationStatusToMatchAvailability(input.participation?.status);
  const availabilityConflict = hasMatchAvailabilityConflict({
    selected: input.selected,
    availability,
  });
  const presentation = getMatchParticipationStatusPresentation(
    input.participation?.status ?? null,
    { selected: input.selected, availability },
  );
  const staleRosterSelection = input.selected && !input.rosterEligible;
  return {
    personId: input.personId,
    displayName: input.displayName,
    shirtNumber: input.shirtNumber,
    sortOrder: input.sortOrder,
    rosterEligible: input.rosterEligible,
    rosterIneligibleLabel: input.rosterEligible ? null : "Nicht mehr im Saison-Kader",
    rosterStatus: input.rosterStatus,
    availability,
    availabilityLabel: presentation.label,
    presentationStatus: presentation.status,
    presentationTone: presentation.tone,
    presentationIcon: presentation.icon,
    participationStatus: input.participation?.status ?? null,
    participationNote: input.participation?.note ?? null,
    responseSource: input.participation?.responseSource ?? null,
    responseProvenanceLabel: getParticipationResponseProvenanceLabel(
      input.participation?.responseSource,
    ),
    selected: input.selected,
    availabilityConflict,
    staleRosterSelection,
    canSelect: canSelectForMatchSquad({
      rosterEligible: input.rosterEligible,
      editable: input.editable,
      availability,
    }),
    canRemove: canRemoveFromMatchSquad({ selected: input.selected, editable: input.editable }),
  };
}

function deriveCounts(players: MatchSquadPlayerPresentation[]): MatchSquadCounts {
  let available = 0;
  let unavailable = 0;
  let maybe = 0;
  let open = 0;
  let selected = 0;
  let selectedAvailable = 0;
  let selectedMaybe = 0;
  let selectedOpen = 0;
  let conflicts = 0;

  for (const player of players) {
    switch (player.presentationStatus) {
      case "AVAILABLE":
        available += 1;
        break;
      case "UNAVAILABLE":
        unavailable += 1;
        break;
      case "MAYBE":
        maybe += 1;
        break;
      case "OPEN":
      default:
        open += 1;
        break;
    }

    if (player.selected) {
      selected += 1;
      if (player.presentationStatus === "AVAILABLE") selectedAvailable += 1;
      if (player.presentationStatus === "MAYBE") selectedMaybe += 1;
      if (player.presentationStatus === "OPEN") selectedOpen += 1;
      if (player.availabilityConflict) conflicts += 1;
    }
  }

  return {
    rosterTotal: players.length,
    available,
    unavailable,
    maybe,
    open,
    selected,
    selectedAvailable,
    selectedMaybe,
    selectedOpen,
    conflicts,
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
    loadCurrentRosterRows(context.teamSeasonId, tenantId),
    prisma.matchSquad.findUnique({
      where: { tenantId_eventId: { tenantId, eventId } },
      select: { id: true, updatedAt: true, teamSeasonId: true },
    }),
  ]);

  const rosterByPerson = new Map(rosterRows.map((row) => [row.personId, row]));
  const selectedIds = squad ? await loadSelectedPersonIds(squad.id) : [];
  const participationPersonIds = [
    ...new Set([...rosterRows.map((row) => row.personId), ...selectedIds]),
  ];
  const participationByPerson = await loadParticipationByPerson(
    tenantId,
    eventId,
    participationPersonIds,
  );

  const selected: MatchSquadPlayerPresentation[] = [];
  for (const personId of selectedIds) {
    const rosterRow = rosterByPerson.get(personId);
    if (rosterRow) {
      selected.push(
        buildPlayerPresentation({
          personId: rosterRow.personId,
          displayName: formatPersonName(rosterRow.person),
          shirtNumber: rosterRow.shirtNumber,
          sortOrder: rosterRow.sortOrder,
          rosterEligible: true,
          rosterStatus: rosterRow.status,
          participation: participationByPerson.get(personId),
          selected: true,
          editable: editability.editable,
        }),
      );
      continue;
    }
    const person = await prisma.person.findFirst({
      where: { id: personId, tenantId },
      select: { id: true, firstName: true, lastName: true, displayName: true },
    });
    if (!person) continue;
    selected.push(
      buildPlayerPresentation({
        personId: person.id,
        displayName: formatPersonName(person),
        shirtNumber: null,
        sortOrder: 9999,
        rosterEligible: false,
        rosterStatus: null,
        participation: participationByPerson.get(personId),
        selected: true,
        editable: editability.editable,
      }),
    );
  }

  const selectedSet = new Set(selected.map((row) => row.personId));
  const remaining = rosterRows
    .filter((row) => !selectedSet.has(row.personId))
    .map((row) =>
      buildPlayerPresentation({
        personId: row.personId,
        displayName: formatPersonName(row.person),
        shirtNumber: row.shirtNumber,
        sortOrder: row.sortOrder,
        rosterEligible: true,
        rosterStatus: row.status,
        participation: participationByPerson.get(row.personId),
        selected: false,
        editable: editability.editable,
      }),
    );

  const counts = deriveCounts([...remaining, ...selected]);

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
    counts,
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
  const rosterRows = await loadCurrentRosterRows(context.teamSeasonId, input.tenantId);
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
        "Person ist nicht im Saison-Kader dieses Teams.",
        "NOT_ROSTER_MEMBER",
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
