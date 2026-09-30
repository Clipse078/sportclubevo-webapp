/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — manual Erinnerung senden via canonical COMM-10 path.
 */

import { parseSpielbetriebAudienceCandidateId } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";
import {
  assertSpielbetriebTeamCommunicationSend,
  assertSpielbetriebTeamCommunicationView,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-team-authorization";
import {
  isParticipationResponseRequested,
  isSpielbetriebEventRelevantForParticipationAttention,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-event-relevance";
import { sendEventNoResponseSmartReminder } from "@/lib/communication/event/event-communication-service";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import { resolveEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { prisma } from "@/lib/db/prisma";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";

export type SpielbetriebParticipationReminderResult = {
  recipientCount: number;
  communicationId: string | null;
  duplicate?: boolean;
  resolvedOutstandingCount: number;
};

export async function executeSpielbetriebOutstandingParticipationReminder(input: {
  tenantId: string;
  userId: string;
  candidateId: string;
  bodyText?: string | null;
  kind?: string;
  now?: Date;
}): Promise<SpielbetriebParticipationReminderResult> {
  const parsed = parseSpielbetriebAudienceCandidateId(input.candidateId);
  if (!parsed) {
    throw new Error(`Ungültige Spielteilnahme-Referenz «${input.candidateId}».`);
  }
  if (parsed.preset !== "NOT_RESPONDED") {
    throw new Error("Erinnerung senden ist nur für «Rückmeldung ausstehend» verfügbar.");
  }

  await assertSpielbetriebTeamCommunicationView({
    tenantId: input.tenantId,
    userId: input.userId,
    teamId: parsed.teamId,
  });
  await assertSpielbetriebTeamCommunicationSend({
    tenantId: input.tenantId,
    userId: input.userId,
    teamId: parsed.teamId,
  });

  const now = input.now ?? new Date();
  const event = await prisma.event.findFirst({
    where: {
      id: parsed.eventId,
      tenantId: input.tenantId,
      teamId: parsed.teamId,
      type: parsed.eventKind,
    },
    select: {
      id: true,
      status: true,
      startAt: true,
      type: true,
      participationResponseDueAt: true,
    },
  });
  if (!event) {
    throw new TeamCommunicationNotFoundError("event not found");
  }
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
    throw new TeamCommunicationNotFoundError("event no longer actionable");
  }

  const anchor = await resolveEventParticipationAnchor({
    tenantId: input.tenantId,
    teamId: parsed.teamId,
    teamSeasonId: parsed.teamSeasonId,
    event: { eventKind: parsed.eventKind, eventId: parsed.eventId },
  });

  const outstanding = await listParticipationSubjectPersonIds({
    anchor,
    preset: "NOT_RESPONDED",
  });

  if (outstanding.length === 0) {
    return {
      recipientCount: 0,
      communicationId: null,
      resolvedOutstandingCount: 0,
    };
  }

  const result = await sendEventNoResponseSmartReminder({
    tenantId: input.tenantId,
    teamId: parsed.teamId,
    teamSeasonId: parsed.teamSeasonId,
    event: { eventKind: parsed.eventKind, eventId: parsed.eventId },
    senderUserId: input.userId,
    viewerCanSend: true,
    bodyText: input.bodyText,
    kind: input.kind,
  });

  return {
    recipientCount: result.recipientCount,
    communicationId: result.communicationId,
    duplicate: result.duplicate,
    resolvedOutstandingCount: outstanding.length,
  };
}
