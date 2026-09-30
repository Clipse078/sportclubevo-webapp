/**
 * SCE-EVENTS-AUDIENCE-01 — Events DomainOperationalAttentionSource (outstanding participation).
 */

import type {
  DomainOperationalAttentionEvaluationContext,
  DomainOperationalAttentionItem,
  DomainOperationalAttentionSource,
} from "@/lib/domain-attention/types";
import { buildDomainOperationalAttentionId } from "@/lib/domain-attention/source-identity";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import {
  buildClubEventAudienceCandidateId,
  EVENTS_DOMAIN_KEY,
  EVENTS_TEILNAHME_REGISTRY_KEY,
} from "@/lib/events/domain-audience/club-event-audience-candidates";
import {
  isClubEventRelevantForParticipationAttention,
  isClubEventType,
} from "@/lib/events/domain-audience/club-event-relevance";
import { permissionKeysIncludeClubEventAudienceView } from "@/lib/events/domain-audience/club-event-authorization";
import { resolveClubEventParticipationAnchor } from "@/lib/events/domain-audience/club-event-participation-anchor";
import { getVeranstaltungHref } from "@/lib/events/veranstaltung-navigation";

export const CLUB_EVENT_PARTICIPATION_OUTSTANDING_ATTENTION_KIND =
  "participation-outstanding" as const;

export const CLUB_EVENT_PARTICIPATION_REMINDER_ACTION_KEY =
  "events.participation.remind-not-responded" as const;

function formatAttentionTitle(eventTitle: string): string {
  return `Vereinsanlass · ${eventTitle.trim()}`;
}

export const clubEventParticipationOutstandingAttentionSource: DomainOperationalAttentionSource =
  {
    domainKey: EVENTS_DOMAIN_KEY,
    requiredPermissions: [PERMISSIONS.EVENTS_VIEW],
    async canDiscover(ctx) {
      return permissionKeysIncludeClubEventAudienceView(ctx.permissionKeys);
    },
    async evaluateAttention(
      ctx: DomainOperationalAttentionEvaluationContext,
    ): Promise<DomainOperationalAttentionItem[]> {
      if (!permissionKeysIncludeClubEventAudienceView(ctx.permissionKeys)) {
        return [];
      }

      const events = await prisma.event.findMany({
        where: {
          tenantId: ctx.tenantId,
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
        take: 40,
      });

      const items: DomainOperationalAttentionItem[] = [];

      for (const event of events) {
        if (!isClubEventType(event.type)) continue;
        if (
          !isClubEventRelevantForParticipationAttention({
            type: event.type,
            status: event.status,
            startAt: event.startAt,
            endAt: event.endAt,
            now: ctx.now,
            participationResponseDueAt: event.participationResponseDueAt,
          })
        ) {
          continue;
        }

        const anchor = await resolveClubEventParticipationAnchor({
          tenantId: ctx.tenantId,
          eventId: event.id,
        });

        const outstanding = await listParticipationSubjectPersonIds({
          anchor,
          preset: "NOT_RESPONDED",
        });
        if (outstanding.length === 0) continue;

        const candidateId = buildClubEventAudienceCandidateId({
          eventId: event.id,
          preset: "NOT_RESPONDED",
        });

        const deferredAudience = {
          sourceKey: EVENTS_TEILNAHME_REGISTRY_KEY,
          candidateId,
          displayLabel: "Veranstaltungsteilnahme – Rückmeldung ausstehend",
        };

        items.push({
          id: buildDomainOperationalAttentionId({
            domainKey: EVENTS_DOMAIN_KEY,
            attentionKind: CLUB_EVENT_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
            contextEntityType: "club-event",
            contextEntityId: event.id,
          }),
          tenantId: ctx.tenantId,
          domainKey: EVENTS_DOMAIN_KEY,
          attentionKind: CLUB_EVENT_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
          contextEntityType: "club-event",
          contextEntityId: event.id,
          title: formatAttentionTitle(event.title),
          summary: `${outstanding.length} Rückmeldung${outstanding.length === 1 ? "" : "en"} ausstehend`,
          severity: "info",
          count: outstanding.length,
          dueAt: event.participationResponseDueAt?.toISOString() ?? null,
          deepLink: getVeranstaltungHref(event.id),
          optionalDomainAudience: deferredAudience,
          actions: [
            {
              actionKey: CLUB_EVENT_PARTICIPATION_REMINDER_ACTION_KEY,
              label: "Erinnerung senden",
              executionKind: "COMMUNICATION_SEND",
              requiredPermissions: [
                PERMISSIONS.EVENTS_MANAGE,
                PERMISSIONS.COMMUNICATION_CLUB_SEND,
              ],
              domainAudience: deferredAudience,
              href: getVeranstaltungHref(event.id),
            },
          ],
        });
      }

      return items;
    },
  };

export async function evaluateClubEventParticipationOperationalAttention(
  ctx: DomainOperationalAttentionEvaluationContext,
): Promise<DomainOperationalAttentionItem[]> {
  if (!(await clubEventParticipationOutstandingAttentionSource.canDiscover(ctx))) {
    return [];
  }
  return clubEventParticipationOutstandingAttentionSource.evaluateAttention(ctx);
}
