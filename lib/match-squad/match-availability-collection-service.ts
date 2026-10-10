/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01B — trainer availability collection (request preview, reminders).
 */

import { prisma } from "@/lib/db/prisma";
import { resolveEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { createGuardianExpansionPort } from "@/lib/communication/platform/recipient-resolution/guardian-expansion";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";
import {
  buildSpielbetriebAudienceCandidateId,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";
import {
  assertSpielbetriebTeamCommunicationSend,
  assertSpielbetriebTeamCommunicationView,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-team-authorization";
import { executeSpielbetriebOutstandingParticipationReminder } from "@/lib/spielbetrieb/operational-attention/spielbetrieb-participation-reminder-action";
import {
  canConfigureMatchAvailabilityRequest,
  canSendMatchAvailabilityReminder,
  matchAvailabilityReadOnlyReason,
} from "@/lib/match-squad/match-availability-lifecycle";
import { resolveMatchSquadEventContext } from "@/lib/match-squad/event-context";

export type MatchAvailabilityCollectionMeta = {
  participationResponseDueAt: string | null;
  participationReminder1At: string | null;
  participationReminder2At: string | null;
  participationReminder1PresetKey: string | null;
  participationReminder2PresetKey: string | null;
  requestActive: boolean;
  readOnlyReason: string | null;
  canConfigureRequest: boolean;
  canSendReminder: boolean;
  reminderCandidateId: string;
  outstandingPlayerCount: number;
  reminderDeliveryTargetCount: number | null;
};

async function countDeliveryTargetsForSubjects(
  tenantId: string,
  subjectPersonIds: string[],
): Promise<number> {
  if (subjectPersonIds.length === 0) return 0;
  const port = createGuardianExpansionPort();
  const targets = await port.expandSubjectsToDeliveryTargets({
    tenantId,
    subjectPersonIds,
    category: "TEAM_OPERATIONAL",
    channel: "IN_APP",
  });
  const unique = new Set<string>();
  for (const target of targets) {
    for (const userId of target.deliveryUserIds) {
      unique.add(userId);
    }
  }
  return unique.size;
}

export async function loadMatchAvailabilityCollectionMeta(input: {
  tenantId: string;
  eventId: string;
  userId: string;
  now?: Date;
}): Promise<MatchAvailabilityCollectionMeta> {
  const now = input.now ?? new Date();
  const context = await resolveMatchSquadEventContext(input.tenantId, input.eventId);

  const event = await prisma.event.findFirst({
    where: { id: input.eventId, tenantId: input.tenantId, type: "MATCH" },
    select: {
      startAt: true,
      status: true,
      participationResponseDueAt: true,
      participationReminder1At: true,
      participationReminder2At: true,
      participationReminder1PresetKey: true,
      participationReminder2PresetKey: true,
    },
  });

  if (!event) {
    throw new Error("Spiel nicht gefunden.");
  }

  const lifecycle = {
    status: event.status,
    startAt: event.startAt,
    participationResponseDueAt: event.participationResponseDueAt,
    now,
  };

  const readOnlyReason = matchAvailabilityReadOnlyReason(lifecycle);
  const requestActive = isParticipationResponseRequested({
    participationResponseDueAt: event.participationResponseDueAt,
  });

  const reminderCandidateId = buildSpielbetriebAudienceCandidateId({
    teamId: context.teamId,
    teamSeasonId: context.teamSeasonId,
    eventId: context.eventId,
    eventKind: "MATCH",
    preset: "NOT_RESPONDED",
  });

  let outstandingPlayerCount = 0;
  let reminderDeliveryTargetCount: number | null = null;

  if (requestActive && readOnlyReason === null) {
    const anchor = await resolveEventParticipationAnchor({
      tenantId: input.tenantId,
      teamId: context.teamId,
      teamSeasonId: context.teamSeasonId,
      event: { eventKind: "MATCH", eventId: context.eventId },
    });
    const outstanding = await listParticipationSubjectPersonIds({
      anchor,
      preset: "NOT_RESPONDED",
    });
    outstandingPlayerCount = outstanding.length;
    if (outstanding.length > 0) {
      try {
        await assertSpielbetriebTeamCommunicationView({
          tenantId: input.tenantId,
          userId: input.userId,
          teamId: context.teamId,
        });
        reminderDeliveryTargetCount = await countDeliveryTargetsForSubjects(
          input.tenantId,
          outstanding,
        );
      } catch {
        reminderDeliveryTargetCount = null;
      }
    }
  }

  return {
    participationResponseDueAt: event.participationResponseDueAt?.toISOString() ?? null,
    participationReminder1At: event.participationReminder1At?.toISOString() ?? null,
    participationReminder2At: event.participationReminder2At?.toISOString() ?? null,
    participationReminder1PresetKey: event.participationReminder1PresetKey,
    participationReminder2PresetKey: event.participationReminder2PresetKey,
    requestActive,
    readOnlyReason,
    canConfigureRequest: canConfigureMatchAvailabilityRequest(lifecycle),
    canSendReminder: canSendMatchAvailabilityReminder(lifecycle),
    reminderCandidateId,
    outstandingPlayerCount,
    reminderDeliveryTargetCount,
  };
}

export async function sendMatchAvailabilityOutstandingReminder(input: {
  tenantId: string;
  userId: string;
  eventId: string;
  bodyText?: string | null;
  now?: Date;
}): Promise<{
  recipientCount: number;
  communicationId: string | null;
  duplicate?: boolean;
  resolvedOutstandingCount: number;
}> {
  const meta = await loadMatchAvailabilityCollectionMeta({
    tenantId: input.tenantId,
    eventId: input.eventId,
    userId: input.userId,
    now: input.now,
  });

  if (meta.readOnlyReason) {
    throw new Error(meta.readOnlyReason);
  }
  if (!meta.canSendReminder) {
    throw new Error("Keine aktive Verfügbarkeitsanfrage — bitte zuerst Rückmeldung bis setzen.");
  }
  if (meta.outstandingPlayerCount === 0) {
    return {
      recipientCount: 0,
      communicationId: null,
      resolvedOutstandingCount: 0,
    };
  }

  const context = await resolveMatchSquadEventContext(input.tenantId, input.eventId);
  await assertSpielbetriebTeamCommunicationSend({
    tenantId: input.tenantId,
    userId: input.userId,
    teamId: context.teamId,
  });

  return executeSpielbetriebOutstandingParticipationReminder({
    tenantId: input.tenantId,
    userId: input.userId,
    candidateId: meta.reminderCandidateId,
    bodyText: input.bodyText,
    now: input.now,
  });
}
