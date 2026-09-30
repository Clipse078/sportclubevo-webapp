/**
 * SCE-TRAINING-AUDIENCE-01 — live training participation → explicit Person ids for COMM-03.
 */

import type { ZielgruppeAudienceComponent } from "@/lib/communication/platform/audience/zielgruppe-definition";
import { resolveEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { eventAudienceSpecFromPersonIds } from "@/lib/communication/event/event-participation-recipients";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import {
  isParticipationResponseRequested,
  isTrainingSessionRelevantForParticipationAttention,
  trainingSessionEffectiveStartAt,
} from "@/lib/training/domain-audience/training-session-relevance";
import {
  parseTrainingAudienceCandidateId,
  trainingAudienceDisplayLabel,
} from "@/lib/training/domain-audience/training-audience-candidates";
import { assertTrainingTeamCommunicationView } from "@/lib/training/domain-audience/training-team-authorization";
import { prisma } from "@/lib/db/prisma";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";

export async function materializeTrainingParticipationAudienceComponent(input: {
  tenantId: string;
  senderUserId: string;
  candidateId: string;
  now?: Date;
}): Promise<ZielgruppeAudienceComponent> {
  const parsed = parseTrainingAudienceCandidateId(input.candidateId);
  if (!parsed) {
    throw new Error(`Ungültige Trainingsteilnahme-Zielgruppe «${input.candidateId}».`);
  }

  await assertTrainingTeamCommunicationView({
    tenantId: input.tenantId,
    userId: input.senderUserId,
    teamId: parsed.teamId,
  });

  const session = await prisma.trainingSession.findFirst({
    where: {
      id: parsed.trainingSessionId,
      tenantId: input.tenantId,
      teamSeasonId: parsed.teamSeasonId,
      teamSeason: { teamId: parsed.teamId },
    },
    select: {
      id: true,
      startAt: true,
      overrideStartAt: true,
      status: true,
      participationResponseDueAt: true,
      trainingSeries: { select: { title: true } },
      teamSeason: { select: { team: { select: { name: true } } } },
    },
  });
  if (!session) {
    throw new TeamCommunicationNotFoundError("training session not found");
  }

  const now = input.now ?? new Date();
  if (
    !isParticipationResponseRequested({
      participationResponseDueAt: session.participationResponseDueAt,
    })
  ) {
    throw new TeamCommunicationNotFoundError("participation request not active for training session");
  }
  if (
    !isTrainingSessionRelevantForParticipationAttention({
      status: session.status,
      startAt: session.startAt,
      overrideStartAt: session.overrideStartAt,
      now,
      participationResponseDueAt: session.participationResponseDueAt,
    })
  ) {
    throw new TeamCommunicationNotFoundError(
      "training session no longer actionable for Trainingsteilnahme audience",
    );
  }

  const anchor = await resolveEventParticipationAnchor({
    tenantId: input.tenantId,
    teamId: parsed.teamId,
    teamSeasonId: parsed.teamSeasonId,
    event: { eventKind: "TRAINING", trainingSessionId: parsed.trainingSessionId },
  });

  const subjectPersonIds = await listParticipationSubjectPersonIds({
    anchor,
    preset: parsed.preset,
  });

  const effectiveStart = trainingSessionEffectiveStartAt({
    startAt: session.startAt,
    overrideStartAt: session.overrideStartAt,
  });

  const label = trainingAudienceDisplayLabel({
    sessionTitle: session.trainingSeries.title,
    sessionStartAt: effectiveStart,
    teamDisplayName: session.teamSeason.team?.name ?? null,
    preset: parsed.preset,
  });

  const spec = eventAudienceSpecFromPersonIds(subjectPersonIds);
  const explicit = spec.components[0]?.explicit;
  return {
    label,
    explicit,
  };
}
