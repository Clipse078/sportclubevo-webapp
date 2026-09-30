/**
 * SCE-EVENTS-AUDIENCE-01 — DomainAudienceSource for Veranstaltung (Event.type=OTHER) Teilnahme.
 */

import type { DomainAudienceSource } from "@/lib/communication/platform/audience/domain-audience-source";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  buildClubEventAudienceCandidateId,
  EVENTS_DOMAIN_KEY,
  EVENTS_TEILNAHME_REGISTRY_KEY,
  EVENTS_TEILNAHME_SOURCE_KEY,
  CLUB_EVENT_PARTICIPATION_PRESETS,
  clubEventAudienceDisplayLabel,
  clubEventAudienceProvenanceLabel,
  clubEventParticipationPresetDescription,
} from "@/lib/events/domain-audience/club-event-audience-candidates";
import { materializeClubEventParticipationAudienceComponent } from "@/lib/events/domain-audience/club-event-recipient-materialization";
import {
  isClubEventRelevantForParticipationAttention,
  isClubEventType,
} from "@/lib/events/domain-audience/club-event-relevance";
import { permissionKeysIncludeClubEventAudienceView } from "@/lib/events/domain-audience/club-event-authorization";

export const clubEventTeilnahmeDomainAudienceSource: DomainAudienceSource = {
  key: EVENTS_TEILNAHME_REGISTRY_KEY,
  domainKey: EVENTS_DOMAIN_KEY,
  sourceKey: EVENTS_TEILNAHME_SOURCE_KEY,
  label: "Veranstaltungsteilnahme",
  description:
    "Live Zielgruppen aus Teilnahmeanfragen für Vereinsanlässe (Einladungsliste, aktueller Rückmeldungsstand).",
  requiredPermissions: [PERMISSIONS.EVENTS_VIEW],
  async canDiscover(ctx) {
    return permissionKeysIncludeClubEventAudienceView(ctx.permissionKeys);
  },
  async searchCandidates({ tenantId, query, limit }) {
    const now = new Date();
    const events = await prisma.event.findMany({
      where: {
        tenantId,
        type: "OTHER",
        participationResponseDueAt: { not: null },
        status: { in: ["SCHEDULED", "LIVE"] },
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
      orderBy: [{ startAt: "asc" }],
      take: Math.min(Math.max(limit, 1), 50) * 3,
    });

    const term = query.trim().toLowerCase();
    const candidates = [];

    for (const event of events) {
      if (!isClubEventType(event.type)) continue;
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
        continue;
      }

      for (const preset of CLUB_EVENT_PARTICIPATION_PRESETS) {
        const candidateId = buildClubEventAudienceCandidateId({
          eventId: event.id,
          preset,
        });
        const label = clubEventAudienceDisplayLabel({
          eventTitle: event.title,
          eventStartAt: event.startAt,
          preset,
        });
        const description = clubEventParticipationPresetDescription(preset);
        if (term && !label.toLowerCase().includes(term) && !description.toLowerCase().includes(term)) {
          continue;
        }
        candidates.push({
          sourceKey: EVENTS_TEILNAHME_REGISTRY_KEY,
          candidateId,
          label,
          description,
        });
      }
    }

    return candidates.slice(0, Math.min(Math.max(limit, 1), 50));
  },
  toAudienceComponent() {
    throw new Error(
      "Veranstaltungsteilnahme audiences require live domain resolution; use resolveAudienceComponent.",
    );
  },
  async resolveAudienceComponent({ tenantId, senderUserId, candidateId }) {
    return materializeClubEventParticipationAudienceComponent({
      tenantId,
      senderUserId,
      candidateId,
    });
  },
  provenanceLabel: clubEventAudienceProvenanceLabel,
};
