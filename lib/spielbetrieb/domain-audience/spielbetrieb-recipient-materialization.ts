/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — live event participation → explicit Person ids for COMM-03.
 */

import type { ZielgruppeAudienceComponent } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { resolveEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { eventAudienceSpecFromPersonIds } from "@/lib/communication/event/event-participation-recipients";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import {
  isParticipationResponseRequested,
  isSpielbetriebEventRelevantForParticipationAttention,
  isSpielbetriebMatchOrTournament,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-event-relevance";
import {
  parseSpielbetriebAudienceCandidateId,
  spielbetriebAudienceDisplayLabel,
  type ParsedSpielbetriebAudienceCandidateId,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";
import { assertSpielbetriebTeamCommunicationView } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-team-authorization";
import { prisma } from "@/lib/db/prisma";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";

export async function loadSpielbetriebAudienceCandidateContext(
  tenantId: string,
  parsed: ParsedSpielbetriebAudienceCandidateId,
): Promise<{
  eventTitle: string;
  eventStartAt: Date;
  teamDisplayName: string | null;
}> {
  const event = await prisma.event.findFirst({
    where: {
      id: parsed.eventId,
      tenantId,
      teamId: parsed.teamId,
      type: parsed.eventKind,
    },
    select: {
      title: true,
      startAt: true,
      status: true,
      type: true,
      team: { select: { name: true } },
    },
  });
  if (!event) {
    throw new TeamCommunicationNotFoundError("event not found");
  }
  if (!isSpielbetriebMatchOrTournament(event.type)) {
    throw new TeamCommunicationNotFoundError("event type not supported for Spielbetrieb audience");
  }
  return {
    eventTitle: event.title,
    eventStartAt: event.startAt,
    teamDisplayName: event.team?.name ?? null,
  };
}

export async function materializeSpielbetriebParticipationAudienceComponent(input: {
  tenantId: string;
  senderUserId: string;
  candidateId: string;
  now?: Date;
}): Promise<ZielgruppeAudienceComponent> {
  const parsed = parseSpielbetriebAudienceCandidateId(input.candidateId);
  if (!parsed) {
    throw new Error(`Ungültige Spielteilnahme-Zielgruppe «${input.candidateId}».`);
  }

  await assertSpielbetriebTeamCommunicationView({
    tenantId: input.tenantId,
    userId: input.senderUserId,
    teamId: parsed.teamId,
  });

  const event = await prisma.event.findFirst({
    where: {
      id: parsed.eventId,
      tenantId: input.tenantId,
      teamId: parsed.teamId,
      type: parsed.eventKind,
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      status: true,
      type: true,
      participationResponseDueAt: true,
    },
  });
  if (!event) {
    throw new TeamCommunicationNotFoundError("event not found");
  }

  const now = input.now ?? new Date();
  if (
    !isParticipationResponseRequested({ participationResponseDueAt: event.participationResponseDueAt })
  ) {
    throw new TeamCommunicationNotFoundError("participation request not active for event");
  }
  if (
    !isSpielbetriebEventRelevantForParticipationAttention({
      type: event.type,
      status: event.status,
      startAt: event.startAt,
      now,
      participationResponseDueAt: event.participationResponseDueAt,
    })
  ) {
    throw new TeamCommunicationNotFoundError("event no longer actionable for Spielteilnahme audience");
  }

  const anchor = await resolveEventParticipationAnchor({
    tenantId: input.tenantId,
    teamId: parsed.teamId,
    teamSeasonId: parsed.teamSeasonId,
    event: { eventKind: parsed.eventKind, eventId: parsed.eventId },
  });

  const subjectPersonIds = await listParticipationSubjectPersonIds({
    anchor,
    preset: parsed.preset,
  });

  const label = spielbetriebAudienceDisplayLabel({
    eventTitle: event.title,
    eventStartAt: event.startAt,
    preset: parsed.preset,
  });

  const spec = eventAudienceSpecFromPersonIds(subjectPersonIds);
  const explicit = spec.components[0]?.explicit;
  return {
    label,
    explicit,
  };
}
