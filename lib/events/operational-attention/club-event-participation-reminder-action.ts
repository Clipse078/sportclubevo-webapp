/**
 * SCE-EVENTS-AUDIENCE-01 — manual Erinnerung senden (COMM-10 team path or COMM-11 club path).
 */

import { parseClubEventAudienceCandidateId } from "@/lib/events/domain-audience/club-event-audience-candidates";
import {
  assertClubEventParticipationReminderSend,
  permissionKeysIncludeClubEventAudienceManage,
} from "@/lib/events/domain-audience/club-event-authorization";
import {
  isClubEventRelevantForParticipationAttention,
  isParticipationResponseRequested,
} from "@/lib/events/domain-audience/club-event-relevance";
import { resolveClubEventParticipationAnchor } from "@/lib/events/domain-audience/club-event-participation-anchor";
import { sendEventNoResponseSmartReminder } from "@/lib/communication/event/event-communication-service";
import { eventCommunicationContext } from "@/lib/communication/platform/seams/event-communication-seam";
import {
  eventAudienceSpecFromPersonIds,
  listEventParticipationSubjectPersonIds,
} from "@/lib/communication/event/event-participation-recipients";
import { defaultEventNoResponseReminderBody } from "@/lib/communication/event/event-communication-presentation";
import {
  createClubCommunicationDraft,
  publishClubCommunication,
} from "@/lib/communication/club/club-communication-service";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import { prisma } from "@/lib/db/prisma";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";
import { resolveTeamCommunicationAuthorization } from "@/lib/communication/team/team-communication-authorization";
import { resolveTenantKey } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-team-authorization";

export type ClubEventParticipationReminderResult = {
  recipientCount: number;
  communicationId: string | null;
  duplicate?: boolean;
  resolvedOutstandingCount: number;
};

async function loadPermissionKeys(tenantId: string, userId: string): Promise<Set<string>> {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant } = await resolver.getEffectivePermissions({ userId, tenantId });
  return new Set(tenant);
}

export async function executeClubEventOutstandingParticipationReminder(input: {
  tenantId: string;
  userId: string;
  candidateId: string;
  permissionKeys?: Set<string>;
  bodyText?: string | null;
  kind?: string;
  now?: Date;
}): Promise<ClubEventParticipationReminderResult> {
  const parsed = parseClubEventAudienceCandidateId(input.candidateId);
  if (!parsed) {
    throw new Error(`Ungültige Veranstaltungsteilnahme-Referenz «${input.candidateId}».`);
  }
  if (parsed.preset !== "NOT_RESPONDED") {
    throw new Error("Erinnerung senden ist nur für «Rückmeldung ausstehend» verfügbar.");
  }

  const permissionKeys =
    input.permissionKeys ?? (await loadPermissionKeys(input.tenantId, input.userId));
  await assertClubEventParticipationReminderSend({
    tenantId: input.tenantId,
    userId: input.userId,
    permissionKeys,
  });

  const now = input.now ?? new Date();
  const event = await prisma.event.findFirst({
    where: {
      id: parsed.eventId,
      tenantId: input.tenantId,
      type: "OTHER",
    },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      status: true,
      type: true,
      teamId: true,
      teamSeasonId: true,
      participationResponseDueAt: true,
    },
  });
  if (!event) {
    throw new TeamCommunicationNotFoundError("club event not found");
  }
  if (
    !isParticipationResponseRequested({
      participationResponseDueAt: event.participationResponseDueAt,
    })
  ) {
    throw new TeamCommunicationNotFoundError("participation request not active for club event");
  }
  if (
    !isClubEventRelevantForParticipationAttention({
      type: event.type,
      status: event.status,
      startAt: event.startAt,
      endAt: event.endAt,
      now,
      participationResponseDueAt: event.participationResponseDueAt,
    })
  ) {
    throw new TeamCommunicationNotFoundError("club event no longer actionable");
  }

  const anchor = await resolveClubEventParticipationAnchor({
    tenantId: input.tenantId,
    eventId: parsed.eventId,
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

  const teamId = event.teamId?.trim();
  const teamSeasonId = event.teamSeasonId?.trim();
  if (teamId && teamSeasonId) {
    const tenantKey = await resolveTenantKey(input.tenantId);
    const teamAuth = await resolveTeamCommunicationAuthorization({
      tenantId: input.tenantId,
      tenantKey,
      userId: input.userId,
      teamId,
    });
    if (!teamAuth?.canSend) {
      throw new TeamCommunicationNotFoundError("team communication send denied for club event");
    }

    const result = await sendEventNoResponseSmartReminder({
      tenantId: input.tenantId,
      teamId,
      teamSeasonId,
      event: { eventKind: "CLUB_EVENT", eventId: event.id },
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

  if (!permissionKeysIncludeClubEventAudienceManage(permissionKeys)) {
    throw new TeamCommunicationNotFoundError("events manage required");
  }

  const subjectPersonIds = await listEventParticipationSubjectPersonIds({
    anchor,
    preset: "NOT_RESPONDED",
  });
  const bodyText =
    input.bodyText?.trim() || defaultEventNoResponseReminderBody(event.title);
  const audienceSpec = eventAudienceSpecFromPersonIds(subjectPersonIds);
  const draft = await createClubCommunicationDraft({
    tenantId: input.tenantId,
    senderUserId: input.userId,
    kind: input.kind ?? "MESSAGE",
    bodyText,
    audienceSpec,
    contextRef: eventCommunicationContext(event.id),
  });
  const published = await publishClubCommunication({
    tenantId: input.tenantId,
    communicationId: draft.id,
    senderUserId: input.userId,
  });

  return {
    recipientCount: published.recipientCount,
    communicationId: draft.id,
    resolvedOutstandingCount: outstanding.length,
  };
}
