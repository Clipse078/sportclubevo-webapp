/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — canonical participation population + status filters.
 *
 * COMM-10 (`event-participation-recipients`) and Spielbetrieb DomainAudience
 * must share this module — no duplicate preset logic.
 */

import type { ParticipationResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveClubEventInviteePersonIds } from "@/lib/events/club-event-participation-audience-service";
import type { EventAudiencePreset } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { EVENT_PRESET_PARTICIPATION_FILTER } from "@/lib/communication/platform/seams/event-communication-seam";

type EventParticipationRecipientFilter =
  (typeof EVENT_PRESET_PARTICIPATION_FILTER)[EventAudiencePreset];
import type { ResolvedEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { sortPersonIds } from "@/lib/communication/platform/recipient-resolution/set-algebra";

/** Spielbetrieb domain audience extends COMM-10 presets with explicit MAYBE. */
export type ParticipationAudiencePreset = EventAudiencePreset | "MAYBE_ONLY";

export type ParticipationAudienceFilter =
  | EventParticipationRecipientFilter
  | "MAYBE";

export function participationFilterForPreset(
  preset: ParticipationAudiencePreset,
): ParticipationAudienceFilter {
  if (preset === "MAYBE_ONLY") return "MAYBE";
  return EVENT_PRESET_PARTICIPATION_FILTER[preset];
}

function statusMatchesFilter(
  status: ParticipationResponseStatus,
  filter: ParticipationAudienceFilter,
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
    case "MAYBE":
      return status === "MAYBE";
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

export async function listParticipationSubjectPersonIds(input: {
  anchor: ResolvedEventParticipationAnchor;
  preset: ParticipationAudiencePreset;
}): Promise<string[]> {
  const filter = participationFilterForPreset(input.preset);
  const eligible = await loadEligiblePersonIds(input.anchor);
  if (eligible.length === 0) return [];

  const statusByPerson = await loadParticipationStatusByPerson(input.anchor, eligible);
  return eligible.filter((personId) =>
    statusMatchesFilter(statusByPerson.get(personId) ?? "OPEN", filter),
  );
}

export async function countParticipationPreset(input: {
  anchor: ResolvedEventParticipationAnchor;
  preset: ParticipationAudiencePreset;
}): Promise<number> {
  const ids = await listParticipationSubjectPersonIds(input);
  return ids.length;
}
