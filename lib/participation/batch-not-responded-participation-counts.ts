/**
 * SCE-HOTFIX-LOGIN-01 — batched NOT_RESPONDED counts for operational attention sources.
 *
 * Replaces per-entity resolve + listParticipationSubjectPersonIds loops that caused
 * pathological dashboard SSR latency (N+1 participation resolution).
 */

import type { ParticipationResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ParticipationEventRef } from "@/lib/participation/types";
import type { EventParticipationAnchorRef } from "@/lib/communication/event/orchestration-meta";
import type { ResolvedEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { sortPersonIds } from "@/lib/communication/platform/recipient-resolution/set-algebra";
import {
  resolveOrgUnitAudiencePersonIds,
  resolveRoleAudiencePersonIds,
  resolveTeamAudiencePersonIds,
} from "@/lib/requirements/requirement-audience-resolvers";

function responseLookupKey(input: {
  eventKind: ParticipationEventRef["eventKind"];
  eventId: string | null;
  trainingSessionId: string | null;
}): string {
  if (input.eventKind === "TRAINING") {
    return `TRAINING:${input.trainingSessionId ?? ""}`;
  }
  return `${input.eventKind}:${input.eventId ?? ""}`;
}

function anchorResponseKey(anchor: ResolvedEventParticipationAnchor): string {
  const event = anchor.participationEvent;
  if (event.eventKind === "TRAINING") {
    return responseLookupKey({
      eventKind: event.eventKind,
      eventId: null,
      trainingSessionId: event.trainingSessionId,
    });
  }
  return responseLookupKey({
    eventKind: event.eventKind,
    eventId: event.eventId,
    trainingSessionId: null,
  });
}

async function loadTeamSeasonSquadPersonIds(
  tenantId: string,
  teamSeasonId: string,
): Promise<string[]> {
  const squad = await prisma.playerSquadMember.findMany({
    where: {
      teamSeasonId,
      teamSeason: { team: { tenantId } },
    },
    select: { personId: true },
  });
  return sortPersonIds(squad.map((row) => row.personId));
}

function countOpenParticipation(
  eligiblePersonIds: string[],
  statusByPerson: Map<string, ParticipationResponseStatus>,
): number {
  let count = 0;
  for (const personId of eligiblePersonIds) {
    const status = statusByPerson.get(personId) ?? "OPEN";
    if (status === "OPEN") count += 1;
  }
  return count;
}

export function buildResolvedEventParticipationAnchorFromKnown(input: {
  tenantId: string;
  teamId: string;
  teamSeasonId: string;
  title: string;
  startAt: Date;
  participationEvent: ParticipationEventRef;
}): ResolvedEventParticipationAnchor {
  const contextEventId =
    input.participationEvent.eventKind === "TRAINING"
      ? input.participationEvent.trainingSessionId
      : input.participationEvent.eventId;

  const anchorRef: EventParticipationAnchorRef =
    input.participationEvent.eventKind === "TRAINING"
      ? {
          eventKind: "TRAINING",
          trainingSessionId: input.participationEvent.trainingSessionId,
          teamSeasonId: input.teamSeasonId,
          contextEventId,
        }
      : input.participationEvent.eventKind === "CLUB_EVENT"
        ? {
            eventKind: "CLUB_EVENT",
            eventId: input.participationEvent.eventId,
            teamSeasonId: input.teamSeasonId || null,
            contextEventId,
          }
        : {
            eventKind: input.participationEvent.eventKind,
            eventId: input.participationEvent.eventId,
            teamSeasonId: input.teamSeasonId,
            contextEventId,
          };

  return {
    tenantId: input.tenantId,
    teamId: input.teamId,
    teamSeasonId: input.teamSeasonId,
    title: input.title,
    startAt: input.startAt,
    participationEvent: input.participationEvent,
    contextEventId,
    anchorRef,
  };
}

async function resolveClubEventInviteePersonIdsBatched(
  tenantId: string,
  eventIds: string[],
): Promise<Map<string, string[]>> {
  const byEvent = new Map<string, string[]>();
  if (eventIds.length === 0) return byEvent;

  const entries = await prisma.eventParticipationAudienceEntry.findMany({
    where: { tenantId, eventId: { in: eventIds } },
    select: {
      eventId: true,
      kind: true,
      personId: true,
      teamId: true,
      orgUnitId: true,
      roleId: true,
    },
  });

  const directPersonIdsByEvent = new Map<string, Set<string>>();
  const teamIds = new Set<string>();
  const orgUnitIds = new Set<string>();
  const roleIds = new Set<string>();
  const teamIdsByEvent = new Map<string, Set<string>>();
  const orgUnitIdsByEvent = new Map<string, Set<string>>();
  const roleIdsByEvent = new Map<string, Set<string>>();

  for (const eventId of eventIds) {
    directPersonIdsByEvent.set(eventId, new Set());
    teamIdsByEvent.set(eventId, new Set());
    orgUnitIdsByEvent.set(eventId, new Set());
    roleIdsByEvent.set(eventId, new Set());
  }

  for (const entry of entries) {
    if (entry.kind === "PERSON" && entry.personId) {
      directPersonIdsByEvent.get(entry.eventId)?.add(entry.personId);
    }
    if (entry.kind === "TEAM" && entry.teamId) {
      teamIds.add(entry.teamId);
      teamIdsByEvent.get(entry.eventId)?.add(entry.teamId);
    }
    if (entry.kind === "ORG_UNIT" && entry.orgUnitId) {
      orgUnitIds.add(entry.orgUnitId);
      orgUnitIdsByEvent.get(entry.eventId)?.add(entry.orgUnitId);
    }
    if (entry.kind === "ROLE" && entry.roleId) {
      roleIds.add(entry.roleId);
      roleIdsByEvent.get(entry.eventId)?.add(entry.roleId);
    }
  }

  const personIdsByTeamId = new Map<string, string[]>();
  const personIdsByOrgUnitId = new Map<string, string[]>();
  const personIdsByRoleId = new Map<string, string[]>();

  await Promise.all([
    ...[...teamIds].map(async (teamId) => {
      personIdsByTeamId.set(teamId, await resolveTeamAudiencePersonIds(tenantId, [teamId]));
    }),
    ...[...orgUnitIds].map(async (orgUnitId) => {
      personIdsByOrgUnitId.set(
        orgUnitId,
        await resolveOrgUnitAudiencePersonIds(tenantId, [orgUnitId]),
      );
    }),
    ...[...roleIds].map(async (roleId) => {
      personIdsByRoleId.set(roleId, await resolveRoleAudiencePersonIds(tenantId, [roleId]));
    }),
  ]);

  for (const eventId of eventIds) {
    const merged = new Set<string>(directPersonIdsByEvent.get(eventId));
    for (const teamId of teamIdsByEvent.get(eventId) ?? []) {
      for (const personId of personIdsByTeamId.get(teamId) ?? []) {
        merged.add(personId);
      }
    }
    for (const orgUnitId of orgUnitIdsByEvent.get(eventId) ?? []) {
      for (const personId of personIdsByOrgUnitId.get(orgUnitId) ?? []) {
        merged.add(personId);
      }
    }
    for (const roleId of roleIdsByEvent.get(eventId) ?? []) {
      for (const personId of personIdsByRoleId.get(roleId) ?? []) {
        merged.add(personId);
      }
    }
    byEvent.set(eventId, sortPersonIds([...merged]));
  }

  return byEvent;
}

async function countNotRespondedClubEventAnchorsBatched(
  clubAnchors: ResolvedEventParticipationAnchor[],
  result: Map<string, number>,
): Promise<void> {
  const tenantId = clubAnchors[0]!.tenantId;
  const eventIds = [
    ...new Set(
      clubAnchors.map((anchor) =>
        anchor.participationEvent.eventKind === "CLUB_EVENT"
          ? anchor.participationEvent.eventId
          : anchor.contextEventId,
      ),
    ),
  ];

  const inviteesByEventId = await resolveClubEventInviteePersonIdsBatched(tenantId, eventIds);

  const responses = await prisma.participationResponse.findMany({
    where: {
      tenantId,
      eventKind: "CLUB_EVENT",
      eventId: { in: eventIds },
      teamSeasonId: null,
    },
    select: { eventId: true, personId: true, status: true },
  });

  const statusByEventPerson = new Map<string, ParticipationResponseStatus>();
  for (const response of responses) {
    if (!response.eventId) continue;
    statusByEventPerson.set(`${response.eventId}:${response.personId}`, response.status);
  }

  for (const anchor of clubAnchors) {
    const eventId =
      anchor.participationEvent.eventKind === "CLUB_EVENT"
        ? anchor.participationEvent.eventId
        : anchor.contextEventId;
    const eligible = inviteesByEventId.get(eventId) ?? [];
    let openCount = 0;
    for (const personId of eligible) {
      const status = statusByEventPerson.get(`${eventId}:${personId}`) ?? "OPEN";
      if (status === "OPEN") openCount += 1;
    }
    result.set(anchor.contextEventId, openCount);
  }
}

/**
 * Returns NOT_RESPONDED (OPEN) participant counts keyed by anchor contextEventId.
 */
export async function countNotRespondedParticipantsByContextEventId(
  anchors: ResolvedEventParticipationAnchor[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (anchors.length === 0) return result;

  const clubAnchors = anchors.filter(
    (anchor) => anchor.participationEvent.eventKind === "CLUB_EVENT",
  );
  const teamAnchors = anchors.filter(
    (anchor) => anchor.participationEvent.eventKind !== "CLUB_EVENT",
  );

  if (clubAnchors.length > 0) {
    await countNotRespondedClubEventAnchorsBatched(clubAnchors, result);
  }

  if (teamAnchors.length === 0) return result;

  const tenantId = teamAnchors[0]!.tenantId;
  const byTeamSeason = new Map<string, ResolvedEventParticipationAnchor[]>();
  for (const anchor of teamAnchors) {
    const bucket = byTeamSeason.get(anchor.teamSeasonId) ?? [];
    bucket.push(anchor);
    byTeamSeason.set(anchor.teamSeasonId, bucket);
  }

  for (const [teamSeasonId, seasonAnchors] of byTeamSeason) {
    const eligiblePersonIds = await loadTeamSeasonSquadPersonIds(tenantId, teamSeasonId);
    if (eligiblePersonIds.length === 0) {
      for (const anchor of seasonAnchors) {
        result.set(anchor.contextEventId, 0);
      }
      continue;
    }

    const matchEventIds: string[] = [];
    const trainingSessionIds: string[] = [];
    for (const anchor of seasonAnchors) {
      const event = anchor.participationEvent;
      if (event.eventKind === "TRAINING") {
        trainingSessionIds.push(event.trainingSessionId);
      } else {
        matchEventIds.push(event.eventId);
      }
    }

    const orFilters: Array<Record<string, unknown>> = [];
    if (matchEventIds.length > 0) {
      orFilters.push({
        eventKind: { in: ["MATCH", "TOURNAMENT"] as const },
        eventId: { in: matchEventIds },
      });
    }
    if (trainingSessionIds.length > 0) {
      orFilters.push({
        eventKind: "TRAINING" as const,
        trainingSessionId: { in: trainingSessionIds },
      });
    }

    const responses =
      orFilters.length === 0
        ? []
        : await prisma.participationResponse.findMany({
            where: {
              tenantId,
              teamSeasonId,
              personId: { in: eligiblePersonIds },
              OR: orFilters,
            },
            select: {
              personId: true,
              status: true,
              eventKind: true,
              eventId: true,
              trainingSessionId: true,
            },
          });

    const statusByAnchorKey = new Map<string, Map<string, ParticipationResponseStatus>>();
    for (const anchor of seasonAnchors) {
      statusByAnchorKey.set(anchorResponseKey(anchor), new Map());
    }
    for (const response of responses) {
      const inferredKind = response.eventKind as ParticipationEventRef["eventKind"] | undefined;
      const key =
        inferredKind != null
          ? responseLookupKey({
              eventKind: inferredKind,
              eventId: response.eventId,
              trainingSessionId: response.trainingSessionId,
            })
          : null;
      const bucketFromKey = key ? statusByAnchorKey.get(key) : undefined;
      if (bucketFromKey) {
        bucketFromKey.set(response.personId, response.status);
        continue;
      }

      if (response.eventId) {
        for (const anchor of seasonAnchors) {
          const event = anchor.participationEvent;
          if (event.eventKind === "TRAINING") continue;
          if (event.eventId !== response.eventId) continue;
          statusByAnchorKey.get(anchorResponseKey(anchor))?.set(response.personId, response.status);
        }
        continue;
      }

      if (response.trainingSessionId) {
        for (const anchor of seasonAnchors) {
          const event = anchor.participationEvent;
          if (event.eventKind !== "TRAINING") continue;
          if (event.trainingSessionId !== response.trainingSessionId) continue;
          statusByAnchorKey.get(anchorResponseKey(anchor))?.set(response.personId, response.status);
        }
        continue;
      }

      if (seasonAnchors.length === 1) {
        statusByAnchorKey
          .get(anchorResponseKey(seasonAnchors[0]!))
          ?.set(response.personId, response.status);
      }
    }

    for (const anchor of seasonAnchors) {
      const statusByPerson = statusByAnchorKey.get(anchorResponseKey(anchor)) ?? new Map();
      result.set(
        anchor.contextEventId,
        countOpenParticipation(eligiblePersonIds, statusByPerson),
      );
    }
  }

  return result;
}
