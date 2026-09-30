/**
 * SCE-TRAINING-AUDIENCE-01 — DomainAudienceSource for TrainingSession Teilnahme.
 */

import type { DomainAudienceSource } from "@/lib/communication/platform/audience/domain-audience-source";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  buildTrainingAudienceCandidateId,
  TRAINING_DOMAIN_KEY,
  TRAINING_TEILNAHME_REGISTRY_KEY,
  TRAINING_TEILNAHME_SOURCE_KEY,
  TRAINING_PARTICIPATION_PRESETS,
  trainingAudienceDisplayLabel,
  trainingAudienceProvenanceLabel,
  trainingParticipationPresetDescription,
} from "@/lib/training/domain-audience/training-audience-candidates";
import { materializeTrainingParticipationAudienceComponent } from "@/lib/training/domain-audience/training-recipient-materialization";
import {
  isTrainingSessionRelevantForParticipationAttention,
  trainingSessionEffectiveStartAt,
} from "@/lib/training/domain-audience/training-session-relevance";
import { listTeamIdsWithTrainingAudienceView } from "@/lib/training/domain-audience/training-team-authorization";

export const trainingTeilnahmeDomainAudienceSource: DomainAudienceSource = {
  key: TRAINING_TEILNAHME_REGISTRY_KEY,
  domainKey: TRAINING_DOMAIN_KEY,
  sourceKey: TRAINING_TEILNAHME_SOURCE_KEY,
  label: "Trainingsteilnahme",
  description:
    "Live Zielgruppen aus Teilnahmeanfragen für Trainingseinheiten (Saisonkader, aktueller Rückmeldungsstand).",
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
  async searchCandidates({ tenantId, senderUserId, query, limit }) {
    const now = new Date();
    const teamIds = await listTeamIdsWithTrainingAudienceView({
      tenantId,
      userId: senderUserId,
    });
    if (teamIds.length === 0) return [];

    const sessions = await prisma.trainingSession.findMany({
      where: {
        tenantId,
        teamSeason: { teamId: { in: teamIds } },
        status: "SCHEDULED",
        participationResponseDueAt: { not: null },
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
      take: Math.min(Math.max(limit, 1), 50) * 3,
    });

    const term = query.trim().toLowerCase();
    const candidates = [];

    for (const session of sessions) {
      const teamId = session.teamSeason.teamId;
      if (!teamId) continue;
      if (
        !isTrainingSessionRelevantForParticipationAttention({
          status: session.status,
          startAt: session.startAt,
          overrideStartAt: session.overrideStartAt,
          now,
          participationResponseDueAt: session.participationResponseDueAt,
        })
      ) {
        continue;
      }
      const effectiveStart = trainingSessionEffectiveStartAt({
        startAt: session.startAt,
        overrideStartAt: session.overrideStartAt,
      });
      for (const preset of TRAINING_PARTICIPATION_PRESETS) {
        const candidateId = buildTrainingAudienceCandidateId({
          teamId,
          teamSeasonId: session.teamSeasonId,
          trainingSessionId: session.id,
          preset,
        });
        const label = trainingAudienceDisplayLabel({
          teamDisplayName: session.teamSeason.team?.name,
          sessionTitle: session.trainingSeries.title,
          sessionStartAt: effectiveStart,
          preset,
        });
        const description = trainingParticipationPresetDescription(preset);
        if (
          term &&
          !label.toLowerCase().includes(term) &&
          !description.toLowerCase().includes(term) &&
          !session.trainingSeries.title.toLowerCase().includes(term)
        ) {
          continue;
        }
        candidates.push({
          sourceKey: TRAINING_TEILNAHME_REGISTRY_KEY,
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
      "Trainingsteilnahme audiences require live domain resolution; use resolveAudienceComponent.",
    );
  },
  async resolveAudienceComponent({ tenantId, senderUserId, candidateId }) {
    return materializeTrainingParticipationAudienceComponent({
      tenantId,
      senderUserId,
      candidateId,
    });
  },
  provenanceLabel: trainingAudienceProvenanceLabel,
};
