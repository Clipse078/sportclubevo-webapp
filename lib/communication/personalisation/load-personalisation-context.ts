/**
 * SCE-COMM-EVO-06 — deterministic context loading for personalisation.
 */

import type { CommunicationContextRef } from "@/lib/communication/platform/communication-context";
import { prisma } from "@/lib/db/prisma";
import { getPitchDisplayLabel, getDressingRoomDisplayLabel } from "@/lib/facilities/display-helpers";
import { formatPersonName } from "@/lib/communication/personalisation/formatters";

export type LoadedPersonalisationEventContext = {
  eventId: string;
  type: string;
  title: string;
  location: string | null;
  startAt: Date;
  endAt: Date | null;
  meetingTime: Date | null;
  opponentName: string | null;
  competitionLabel: string | null;
  homeAway: string | null;
  pitchCode: string | null;
  homeDressingRoomCode: string | null;
  awayDressingRoomCode: string | null;
  participationResponseDueAt: Date | null;
  teamId: string | null;
  teamName: string | null;
  teamShortName: string | null;
  teamAgeGroup: string | null;
  teamGender: string | null;
  seasonId: string | null;
  seasonName: string | null;
  seasonStart: Date | null;
  seasonEnd: Date | null;
  tournamentPitchLabels: string[];
  tournamentDressingRoomLabels: string[];
};

export type LoadedPersonalisationContext = {
  tenantId: string;
  tenantName: string;
  tenantEmail: string | null;
  timeZone: string;
  locale: string;
  contextRef: CommunicationContextRef;
  contextTeamId: string | null;
  contextTeamName: string | null;
  contextTeamShortName: string | null;
  contextTeamAgeGroup: string | null;
  contextTeamGender: string | null;
  orgUnitName: string | null;
  event: LoadedPersonalisationEventContext | null;
  activeSeasonName: string | null;
  activeSeasonStart: Date | null;
  activeSeasonEnd: Date | null;
};

function resolveTenantTimeZone(timezone: string | null | undefined): string {
  const tz = timezone?.trim();
  return tz || "Europe/Zurich";
}

export async function loadPersonalisationContext(input: {
  tenantId: string;
  contextRef: CommunicationContextRef;
}): Promise<LoadedPersonalisationContext | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: input.tenantId },
    select: {
      id: true,
      name: true,
      emailSenderAddress: true,
      timezone: true,
      locale: true,
    },
  });
  if (!tenant) return null;

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    select: { name: true, startDate: true, endDate: true },
  });

  let contextTeamId: string | null = null;
  let orgUnitName: string | null = null;
  let event: LoadedPersonalisationEventContext | null = null;

  if (input.contextRef.kind === "TEAM") {
    contextTeamId = input.contextRef.teamId;
  } else if (input.contextRef.kind === "ORG_UNIT") {
    const orgUnit = await prisma.orgUnit.findFirst({
      where: { id: input.contextRef.orgUnitId, tenantId: input.tenantId },
      select: { name: true },
    });
    orgUnitName = orgUnit?.name ?? null;
  } else if (input.contextRef.kind === "EVENT") {
    const row = await prisma.event.findFirst({
      where: { id: input.contextRef.eventId, tenantId: input.tenantId },
      include: {
        team: { select: { id: true, name: true, shortName: true, ageGroup: true, genderGroup: true } },
        season: { select: { id: true, name: true, startDate: true, endDate: true } },
        tournamentResourceAllocations: {
          orderBy: { displayOrder: "asc" },
          include: { facilityResource: { select: { name: true, code: true } } },
        },
        tournamentParticipants: {
          take: 1,
          orderBy: { displayOrder: "asc" },
          include: {
            dressingRoomAllocations: {
              orderBy: { displayOrder: "asc" },
              include: { facilityResource: { select: { name: true, code: true } } },
            },
          },
        },
      },
    });
    if (row) {
      contextTeamId = row.teamId;
      const tournamentPitchLabels = row.tournamentResourceAllocations.map(
        (a) => a.facilityResource.name?.trim() || getPitchDisplayLabel(a.facilityResource.code) || a.facilityResource.code,
      );
      const dressingFromParticipants = row.tournamentParticipants.flatMap((p) =>
        p.dressingRoomAllocations.map(
          (d) => d.facilityResource.name?.trim() || getDressingRoomDisplayLabel(d.facilityResource.code) || d.facilityResource.code,
        ),
      );
      event = {
        eventId: row.id,
        type: row.type,
        title: row.title,
        location: row.location,
        startAt: row.startAt,
        endAt: row.endAt,
        meetingTime: row.meetingTime,
        opponentName: row.opponentName,
        competitionLabel: row.competitionLabel,
        homeAway: row.homeAway,
        pitchCode: row.pitchCode,
        homeDressingRoomCode: row.homeDressingRoomCode,
        awayDressingRoomCode: row.awayDressingRoomCode,
        participationResponseDueAt: row.participationResponseDueAt,
        teamId: row.teamId,
        teamName: row.team?.name ?? null,
        teamShortName: row.team?.shortName ?? null,
        teamAgeGroup: row.team?.ageGroup ?? null,
        teamGender: row.team?.genderGroup ?? null,
        seasonId: row.seasonId,
        seasonName: row.season?.name ?? null,
        seasonStart: row.season?.startDate ?? null,
        seasonEnd: row.season?.endDate ?? null,
        tournamentPitchLabels,
        tournamentDressingRoomLabels: dressingFromParticipants,
      };
    }
  }

  let contextTeamName: string | null = event?.teamName ?? null;
  let contextTeamShortName: string | null = event?.teamShortName ?? null;
  let contextTeamAgeGroup: string | null = event?.teamAgeGroup ?? null;
  let contextTeamGender: string | null = event?.teamGender ?? null;

  if (contextTeamId && !contextTeamName) {
    const team = await prisma.team.findFirst({
      where: { id: contextTeamId, tenantId: input.tenantId },
      select: { name: true, shortName: true, ageGroup: true, genderGroup: true },
    });
    if (team) {
      contextTeamName = team.name;
      contextTeamShortName = team.shortName;
      contextTeamAgeGroup = team.ageGroup;
      contextTeamGender = team.genderGroup;
    }
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantEmail: tenant.emailSenderAddress,
    timeZone: resolveTenantTimeZone(tenant.timezone),
    locale: tenant.locale?.trim() || "de-CH",
    contextRef: input.contextRef,
    contextTeamId,
    contextTeamName,
    contextTeamShortName,
    contextTeamAgeGroup,
    contextTeamGender,
    orgUnitName,
    event,
    activeSeasonName: activeSeason?.name ?? null,
    activeSeasonStart: activeSeason?.startDate ?? null,
    activeSeasonEnd: activeSeason?.endDate ?? null,
  };
}

export type LoadedRecipientPerson = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  userId: string | null;
};

export async function loadRecipientPersonsBatch(input: {
  tenantId: string;
  personIds: readonly string[];
}): Promise<Map<string, LoadedRecipientPerson>> {
  if (input.personIds.length === 0) return new Map();
  const rows = await prisma.person.findMany({
    where: { tenantId: input.tenantId, id: { in: [...input.personIds] } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      email: true,
      phone: true,
      userId: true,
    },
  });
  return new Map(rows.map((r) => [r.id, r]));
}

export async function loadActiveTeamNamesForPerson(input: {
  tenantId: string;
  personId: string;
  seasonId?: string | null;
}): Promise<string[]> {
  const memberships = await prisma.playerSquadMember.findMany({
    where: {
      personId: input.personId,
      teamSeason: {
        team: { tenantId: input.tenantId, isActive: true },
        ...(input.seasonId ? { seasonId: input.seasonId } : { season: { isActive: true } }),
      },
    },
    select: {
      teamSeason: {
        select: {
          team: { select: { name: true, shortName: true } },
        },
      },
    },
  });
  return memberships.map((m) => {
    const t = m.teamSeason.team;
    return t.shortName?.trim() || t.name;
  });
}

export function formatLoadedPersonName(person: LoadedRecipientPerson): string {
  return formatPersonName(person);
}
