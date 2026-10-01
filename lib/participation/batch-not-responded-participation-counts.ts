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
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";

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
    await Promise.all(
      clubAnchors.map(async (anchor) => {
        const ids = await listParticipationSubjectPersonIds({
          anchor,
          preset: "NOT_RESPONDED",
        });
        result.set(anchor.contextEventId, ids.length);
      }),
    );
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
