/**
 * SCE-COMM-10 — Event recipient presets from canonical ParticipationResponse state.
 */

import type { ParticipationResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveClubEventInviteePersonIds } from "@/lib/events/club-event-participation-audience-service";
import {
  EVENT_PRESET_PARTICIPATION_FILTER,
  type EventContextAudienceRequest,
} from "@/lib/communication/platform/seams/event-communication-seam";
import type { EventAudiencePreset } from "@/lib/communication/platform/audience/zielgruppe-definition";
import type { ResolvedEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { sortPersonIds } from "@/lib/communication/platform/recipient-resolution/set-algebra";

export type EventParticipationRecipientFilter =
  (typeof EVENT_PRESET_PARTICIPATION_FILTER)[EventAudiencePreset];

function statusMatchesFilter(
  status: ParticipationResponseStatus,
  filter: EventParticipationRecipientFilter,
): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "ACCEPTED":
      return status === "YES";
    case "DECLINED":
      return status === "NO";
    case "PENDING":
      return status === "OPEN";
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

async function loadEligiblePersonIds(anchor: ResolvedEventParticipationAnchor): Promise<string[]> {
  const { participationEvent, tenantId, teamSeasonId } = anchor;

  if (participationEvent.eventKind === "CLUB_EVENT") {
    return sortPersonIds(await resolveClubEventInviteePersonIds(tenantId, participationEvent.eventId));
  }

  const squad = await prisma.playerSquadMember.findMany({
    where: {
      teamSeasonId,
      teamSeason: { team: { tenantId } },
    },
    select: { personId: true },
  });
  return sortPersonIds(squad.map((row) => row.personId));
}

async function loadParticipationStatusByPerson(
  anchor: ResolvedEventParticipationAnchor,
  personIds: string[],
): Promise<Map<string, ParticipationResponseStatus>> {
  if (personIds.length === 0) return new Map();

  const { participationEvent, tenantId, teamSeasonId } = anchor;
  const responses = await prisma.participationResponse.findMany({
    where: {
      tenantId,
      personId: { in: personIds },
      eventKind: participationEvent.eventKind,
      ...(participationEvent.eventKind === "CLUB_EVENT"
        ? { eventId: participationEvent.eventId, teamSeasonId: null }
        : {
            teamSeasonId,
            ...(participationEvent.eventKind === "TRAINING"
              ? { trainingSessionId: participationEvent.trainingSessionId }
              : { eventId: participationEvent.eventId }),
          }),
    },
    select: { personId: true, status: true },
  });

  const map = new Map<string, ParticipationResponseStatus>();
  for (const personId of personIds) {
    map.set(personId, "OPEN");
  }
  for (const response of responses) {
    map.set(response.personId, response.status);
  }
  return map;
}

export async function listEventParticipationSubjectPersonIds(input: {
  anchor: ResolvedEventParticipationAnchor;
  preset: EventAudiencePreset;
}): Promise<string[]> {
  const filter = EVENT_PRESET_PARTICIPATION_FILTER[input.preset];
  const eligible = await loadEligiblePersonIds(input.anchor);
  if (eligible.length === 0) return [];

  const statusByPerson = await loadParticipationStatusByPerson(input.anchor, eligible);
  return eligible.filter((personId) =>
    statusMatchesFilter(statusByPerson.get(personId) ?? "OPEN", filter),
  );
}

export async function countEventParticipationPreset(input: {
  anchor: ResolvedEventParticipationAnchor;
  preset: EventAudiencePreset;
}): Promise<number> {
  const ids = await listEventParticipationSubjectPersonIds(input);
  return ids.length;
}

export function eventAudienceSpecFromPersonIds(personIds: readonly string[]) {
  return {
    composition: "UNION" as const,
    components: [
      {
        label: "Event participation preset",
        explicit: { includePersonIds: [...personIds] },
      },
    ],
  };
}

export type EventParticipationAudiencePreview = {
  preset: EventAudiencePreset;
  eligibleCount: number;
  filter: EventParticipationRecipientFilter;
};

export async function previewEventParticipationAudiences(input: {
  anchor: ResolvedEventParticipationAnchor;
  presets: readonly EventAudiencePreset[];
}): Promise<EventParticipationAudiencePreview[]> {
  const results: EventParticipationAudiencePreview[] = [];
  for (const preset of input.presets) {
    const eligibleCount = await countEventParticipationPreset({ anchor: input.anchor, preset });
    results.push({
      preset,
      eligibleCount,
      filter: EVENT_PRESET_PARTICIPATION_FILTER[preset],
    });
  }
  return results;
}

export function toEventContextAudienceRequest(
  tenantId: string,
  anchor: ResolvedEventParticipationAnchor,
  preset: EventAudiencePreset,
): EventContextAudienceRequest {
  return {
    tenantId,
    eventId: anchor.contextEventId,
    preset,
  };
}
