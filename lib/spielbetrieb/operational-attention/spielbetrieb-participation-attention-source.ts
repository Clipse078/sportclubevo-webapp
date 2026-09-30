/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — first DomainOperationalAttentionSource (outstanding participation).
 */

import type {
  DomainOperationalAttentionEvaluationContext,
  DomainOperationalAttentionItem,
  DomainOperationalAttentionSource,
} from "@/lib/domain-attention/types";
import { buildDomainOperationalAttentionId } from "@/lib/domain-attention/source-identity";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import { resolveEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import {
  buildSpielbetriebAudienceCandidateId,
  SPIELBETRIEB_DOMAIN_KEY,
  SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";
import {
  isSpielbetriebEventRelevantForParticipationAttention,
  isSpielbetriebMatchOrTournament,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-event-relevance";
import type { SpielbetriebEventKind } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";
import { listTeamIdsWithSpielbetriebAudienceView } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-team-authorization";

export const SPIELBETRIEB_PARTICIPATION_OUTSTANDING_ATTENTION_KIND =
  "participation-outstanding" as const;

export const SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY =
  "spielbetrieb.participation.remind-not-responded" as const;

function formatAttentionTitle(input: {
  teamName: string | null;
  eventTitle: string;
  eventKind: "MATCH" | "TOURNAMENT";
}): string {
  const teamPrefix = input.teamName?.trim() ? `${input.teamName.trim()} · ` : "";
  const kindLabel = input.eventKind === "TOURNAMENT" ? "Turnier" : "Spiel";
  return `${teamPrefix}${kindLabel} ${input.eventTitle}`;
}

function formatEventWeekday(startAt: Date): string {
  return startAt.toLocaleDateString("de-CH", { weekday: "long" });
}

export const spielbetriebParticipationOutstandingAttentionSource: DomainOperationalAttentionSource =
  {
    domainKey: SPIELBETRIEB_DOMAIN_KEY,
    requiredPermissions: [PERMISSIONS.COMMUNICATION_TEAM_VIEW],
    async canDiscover(ctx) {
      if (!ctx.permissionKeys.has(PERMISSIONS.COMMUNICATION_TEAM_VIEW)) {
        return false;
      }
      const teams = await listTeamIdsWithSpielbetriebAudienceView({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      });
      return teams.length > 0;
    },
    async evaluateAttention(
      ctx: DomainOperationalAttentionEvaluationContext,
    ): Promise<DomainOperationalAttentionItem[]> {
      const teamIds = await listTeamIdsWithSpielbetriebAudienceView({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      });
      if (teamIds.length === 0) return [];

      const events = await prisma.event.findMany({
        where: {
          tenantId: ctx.tenantId,
          teamId: { in: teamIds },
          type: { in: ["MATCH", "TOURNAMENT"] },
          startAt: { gte: ctx.now },
          status: { in: ["SCHEDULED", "LIVE"] },
          teamSeasonId: { not: null },
          participationResponseDueAt: { not: null },
        },
        select: {
          id: true,
          title: true,
          startAt: true,
          type: true,
          status: true,
          teamId: true,
          teamSeasonId: true,
          participationResponseDueAt: true,
          team: { select: { name: true } },
        },
        orderBy: [{ startAt: "asc" }],
        take: 40,
      });

      const items: DomainOperationalAttentionItem[] = [];

      for (const event of events) {
        if (!event.teamId || !event.teamSeasonId) continue;
        if (!isSpielbetriebMatchOrTournament(event.type)) continue;
        const eventKind = event.type as SpielbetriebEventKind;
        if (
          !isSpielbetriebEventRelevantForParticipationAttention({
            type: eventKind,
            status: event.status,
            startAt: event.startAt,
            now: ctx.now,
            participationResponseDueAt: event.participationResponseDueAt,
          })
        ) {
          continue;
        }

        const anchor = await resolveEventParticipationAnchor({
          tenantId: ctx.tenantId,
          teamId: event.teamId,
          teamSeasonId: event.teamSeasonId,
          event: { eventKind, eventId: event.id },
        });

        const outstanding = await listParticipationSubjectPersonIds({
          anchor,
          preset: "NOT_RESPONDED",
        });
        if (outstanding.length === 0) continue;

        const candidateId = buildSpielbetriebAudienceCandidateId({
          teamId: event.teamId,
          teamSeasonId: event.teamSeasonId,
          eventId: event.id,
          eventKind,
          preset: "NOT_RESPONDED",
        });

        const deferredAudience = {
          sourceKey: SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
          candidateId,
          displayLabel: `Spielteilnahme – Rückmeldung ausstehend`,
        };

        items.push({
          id: buildDomainOperationalAttentionId({
            domainKey: SPIELBETRIEB_DOMAIN_KEY,
            attentionKind: SPIELBETRIEB_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
            contextEntityType: "event",
            contextEntityId: event.id,
          }),
          tenantId: ctx.tenantId,
          domainKey: SPIELBETRIEB_DOMAIN_KEY,
          attentionKind: SPIELBETRIEB_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
          contextEntityType: "event",
          contextEntityId: event.id,
          title: formatAttentionTitle({
            teamName: event.team?.name ?? null,
            eventTitle: event.title,
            eventKind,
          }),
          summary: `${outstanding.length} Rückmeldung${outstanding.length === 1 ? "" : "en"} ausstehend · ${formatEventWeekday(event.startAt)}`,
          severity: "info",
          count: outstanding.length,
          dueAt: null,
          deepLink: `/dashboard/teams/${event.teamId}/teilnahmen`,
          optionalDomainAudience: deferredAudience,
          actions: [
            {
              actionKey: SPIELBETRIEB_PARTICIPATION_REMINDER_ACTION_KEY,
              label: "Erinnerung senden",
              executionKind: "COMMUNICATION_SEND",
              requiredPermissions: [
                PERMISSIONS.COMMUNICATION_TEAM_VIEW,
                PERMISSIONS.COMMUNICATION_TEAM_SEND,
              ],
              domainAudience: deferredAudience,
              href: `/dashboard/teams/${event.teamId}/teilnahmen`,
            },
          ],
        });
      }

      return items;
    },
  };

export async function evaluateSpielbetriebParticipationOperationalAttention(
  ctx: DomainOperationalAttentionEvaluationContext,
): Promise<DomainOperationalAttentionItem[]> {
  if (!(await spielbetriebParticipationOutstandingAttentionSource.canDiscover(ctx))) {
    return [];
  }
  return spielbetriebParticipationOutstandingAttentionSource.evaluateAttention(ctx);
}
