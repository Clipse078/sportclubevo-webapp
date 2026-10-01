/**
 * SCE-TRAINING-AUDIENCE-01 — Training DomainOperationalAttentionSource (outstanding participation).
 */

import type {
  DomainOperationalAttentionEvaluationContext,
  DomainOperationalAttentionItem,
  DomainOperationalAttentionSource,
} from "@/lib/domain-attention/types";
import { buildDomainOperationalAttentionId } from "@/lib/domain-attention/source-identity";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  buildResolvedEventParticipationAnchorFromKnown,
  countNotRespondedParticipantsByContextEventId,
} from "@/lib/participation/batch-not-responded-participation-counts";
import {
  buildTrainingAudienceCandidateId,
  TRAINING_DOMAIN_KEY,
  TRAINING_TEILNAHME_REGISTRY_KEY,
} from "@/lib/training/domain-audience/training-audience-candidates";
import {
  isTrainingSessionRelevantForParticipationAttention,
  trainingSessionEffectiveStartAt,
} from "@/lib/training/domain-audience/training-session-relevance";
import { listTeamIdsWithTrainingAudienceView } from "@/lib/training/domain-audience/training-team-authorization";

export const TRAINING_PARTICIPATION_OUTSTANDING_ATTENTION_KIND =
  "participation-outstanding" as const;

export const TRAINING_PARTICIPATION_REMINDER_ACTION_KEY =
  "training.participation.remind-not-responded" as const;

function formatAttentionTitle(input: {
  teamName: string | null;
  sessionTitle: string;
  sessionStartAt: Date;
}): string {
  const teamPrefix = input.teamName?.trim() ? `${input.teamName.trim()} · ` : "";
  const weekday = input.sessionStartAt.toLocaleDateString("de-CH", { weekday: "long" });
  const time = input.sessionStartAt.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${teamPrefix}Training ${weekday} ${time}`;
}

export const trainingParticipationOutstandingAttentionSource: DomainOperationalAttentionSource =
  {
    domainKey: TRAINING_DOMAIN_KEY,
    requiredPermissions: [PERMISSIONS.COMMUNICATION_TEAM_VIEW],
    async canDiscover(ctx) {
      if (!ctx.permissionKeys.has(PERMISSIONS.COMMUNICATION_TEAM_VIEW)) {
        return false;
      }
      const teams = await listTeamIdsWithTrainingAudienceView({
        tenantId: ctx.tenantId,
        userId: ctx.userId,
      });
      return teams.length > 0;
    },
    async evaluateAttention(
      ctx: DomainOperationalAttentionEvaluationContext,
    ): Promise<DomainOperationalAttentionItem[]> {
      if (!ctx.permissionKeys.has(PERMISSIONS.COMMUNICATION_TEAM_VIEW)) {
        return [];
      }
      const teamIds = [
        ...(ctx.communicationTeamIds ??
          (await listTeamIdsWithTrainingAudienceView({
            tenantId: ctx.tenantId,
            userId: ctx.userId,
          }))),
      ];
      if (teamIds.length === 0) return [];

      const sessions = await prisma.trainingSession.findMany({
        where: {
          tenantId: ctx.tenantId,
          teamSeason: { teamId: { in: teamIds } },
          status: "SCHEDULED",
          participationResponseDueAt: { not: null },
          OR: [
            { overrideStartAt: { gte: ctx.now } },
            { overrideStartAt: null, startAt: { gte: ctx.now } },
          ],
        },
        select: {
          id: true,
          startAt: true,
          overrideStartAt: true,
          status: true,
          teamSeasonId: true,
          participationResponseDueAt: true,
          trainingSeries: { select: { title: true } },
          teamSeason: { select: { teamId: true, team: { select: { name: true } } } },
        },
        orderBy: [{ startAt: "asc" }],
        take: 40,
      });

      const relevantSessions = sessions.filter((session) => {
        const teamId = session.teamSeason.teamId;
        if (!teamId) return false;
        return isTrainingSessionRelevantForParticipationAttention({
          status: session.status,
          startAt: session.startAt,
          overrideStartAt: session.overrideStartAt,
          now: ctx.now,
          participationResponseDueAt: session.participationResponseDueAt,
        });
      });

      const anchors = relevantSessions.map((session) =>
        buildResolvedEventParticipationAnchorFromKnown({
          tenantId: ctx.tenantId,
          teamId: session.teamSeason.teamId,
          teamSeasonId: session.teamSeasonId,
          title: session.trainingSeries.title,
          startAt: session.startAt,
          participationEvent: { eventKind: "TRAINING", trainingSessionId: session.id },
        }),
      );

      const outstandingBySessionId =
        await countNotRespondedParticipantsByContextEventId(anchors);

      const items: DomainOperationalAttentionItem[] = [];

      for (const session of relevantSessions) {
        const teamId = session.teamSeason.teamId;
        const outstandingCount = outstandingBySessionId.get(session.id) ?? 0;
        if (outstandingCount === 0) continue;

        const candidateId = buildTrainingAudienceCandidateId({
          teamId,
          teamSeasonId: session.teamSeasonId,
          trainingSessionId: session.id,
          preset: "NOT_RESPONDED",
        });

        const deferredAudience = {
          sourceKey: TRAINING_TEILNAHME_REGISTRY_KEY,
          candidateId,
          displayLabel: "Trainingsteilnahme – Rückmeldung ausstehend",
        };

        const effectiveStart = trainingSessionEffectiveStartAt({
          startAt: session.startAt,
          overrideStartAt: session.overrideStartAt,
        });

        items.push({
          id: buildDomainOperationalAttentionId({
            domainKey: TRAINING_DOMAIN_KEY,
            attentionKind: TRAINING_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
            contextEntityType: "training-session",
            contextEntityId: session.id,
          }),
          tenantId: ctx.tenantId,
          domainKey: TRAINING_DOMAIN_KEY,
          attentionKind: TRAINING_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
          contextEntityType: "training-session",
          contextEntityId: session.id,
          title: formatAttentionTitle({
            teamName: session.teamSeason.team?.name ?? null,
            sessionTitle: session.trainingSeries.title,
            sessionStartAt: effectiveStart,
          }),
          summary: `${outstandingCount} Rückmeldung${outstandingCount === 1 ? "" : "en"} ausstehend`,
          severity: "info",
          count: outstandingCount,
          dueAt: null,
          deepLink: `/dashboard/teams/${teamId}/teilnahmen`,
          optionalDomainAudience: deferredAudience,
          actions: [
            {
              actionKey: TRAINING_PARTICIPATION_REMINDER_ACTION_KEY,
              label: "Erinnerung senden",
              executionKind: "COMMUNICATION_SEND",
              requiredPermissions: [
                PERMISSIONS.COMMUNICATION_TEAM_VIEW,
                PERMISSIONS.COMMUNICATION_TEAM_SEND,
              ],
              domainAudience: deferredAudience,
              href: `/dashboard/teams/${teamId}/teilnahmen`,
            },
          ],
        });
      }

      return items;
    },
  };

export async function evaluateTrainingParticipationOperationalAttention(
  ctx: DomainOperationalAttentionEvaluationContext,
): Promise<DomainOperationalAttentionItem[]> {
  return trainingParticipationOutstandingAttentionSource.evaluateAttention(ctx);
}
