/**
 * SCE-EVENTS-AUDIENCE-01 — live club-event participation → explicit Person ids for COMM-03.
 */

import type { ZielgruppeAudienceComponent } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { eventAudienceSpecFromPersonIds } from "@/lib/communication/event/event-participation-recipients";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import {
  isClubEventRelevantForParticipationAttention,
  isParticipationResponseRequested,
} from "@/lib/events/domain-audience/club-event-relevance";
import {
  parseClubEventAudienceCandidateId,
  clubEventAudienceDisplayLabel,
} from "@/lib/events/domain-audience/club-event-audience-candidates";
import {
  assertClubEventAudienceView,
  permissionKeysIncludeClubEventAudienceView,
} from "@/lib/events/domain-audience/club-event-authorization";
import { resolveClubEventParticipationAnchor } from "@/lib/events/domain-audience/club-event-participation-anchor";
import { prisma } from "@/lib/db/prisma";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";
import { createEffectivePermissionResolver } from "@/lib/permissions/services/effective-permission-resolver";

async function loadPermissionKeys(tenantId: string, userId: string): Promise<Set<string>> {
  const resolver = createEffectivePermissionResolver(prisma);
  const { tenant } = await resolver.getEffectivePermissions({ userId, tenantId });
  return new Set(tenant);
}

export async function materializeClubEventParticipationAudienceComponent(input: {
  tenantId: string;
  senderUserId: string;
  candidateId: string;
  permissionKeys?: Set<string>;
  now?: Date;
}): Promise<ZielgruppeAudienceComponent> {
  const parsed = parseClubEventAudienceCandidateId(input.candidateId);
  if (!parsed) {
    throw new Error(`Ungültige Veranstaltungsteilnahme-Zielgruppe «${input.candidateId}».`);
  }

  const permissionKeys =
    input.permissionKeys ?? (await loadPermissionKeys(input.tenantId, input.senderUserId));
  await assertClubEventAudienceView({
    tenantId: input.tenantId,
    userId: input.senderUserId,
    permissionKeys,
  });

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
      participationResponseDueAt: true,
    },
  });
  if (!event) {
    throw new TeamCommunicationNotFoundError("club event not found");
  }

  const now = input.now ?? new Date();
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
    throw new TeamCommunicationNotFoundError(
      "club event no longer actionable for Veranstaltungsteilnahme audience",
    );
  }

  const anchor = await resolveClubEventParticipationAnchor({
    tenantId: input.tenantId,
    eventId: parsed.eventId,
  });

  const subjectPersonIds = await listParticipationSubjectPersonIds({
    anchor,
    preset: parsed.preset,
  });

  const label = clubEventAudienceDisplayLabel({
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

export { permissionKeysIncludeClubEventAudienceView };
