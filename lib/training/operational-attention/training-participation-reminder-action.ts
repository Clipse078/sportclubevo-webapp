/**
 * SCE-TRAINING-AUDIENCE-01 — manual Erinnerung senden via canonical COMM-10 path.
 */

import { parseTrainingAudienceCandidateId } from "@/lib/training/domain-audience/training-audience-candidates";
import {
  assertTrainingTeamCommunicationSend,
  assertTrainingTeamCommunicationView,
} from "@/lib/training/domain-audience/training-team-authorization";
import {
  isParticipationResponseRequested,
  isTrainingSessionRelevantForParticipationAttention,
} from "@/lib/training/domain-audience/training-session-relevance";
import { sendEventNoResponseSmartReminder } from "@/lib/communication/event/event-communication-service";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import { resolveEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";
import { prisma } from "@/lib/db/prisma";
import { TeamCommunicationNotFoundError } from "@/lib/communication/team/team-communication-errors";

export type TrainingParticipationReminderResult = {
  recipientCount: number;
  communicationId: string | null;
  duplicate?: boolean;
  resolvedOutstandingCount: number;
};

export async function executeTrainingOutstandingParticipationReminder(input: {
  tenantId: string;
  userId: string;
  candidateId: string;
  bodyText?: string | null;
  kind?: string;
  now?: Date;
}): Promise<TrainingParticipationReminderResult> {
  const parsed = parseTrainingAudienceCandidateId(input.candidateId);
  if (!parsed) {
    throw new Error(`Ungültige Trainingsteilnahme-Referenz «${input.candidateId}».`);
  }
  if (parsed.preset !== "NOT_RESPONDED") {
    throw new Error("Erinnerung senden ist nur für «Rückmeldung ausstehend» verfügbar.");
  }

  await assertTrainingTeamCommunicationView({
    tenantId: input.tenantId,
    userId: input.userId,
    teamId: parsed.teamId,
  });
  await assertTrainingTeamCommunicationSend({
    tenantId: input.tenantId,
    userId: input.userId,
    teamId: parsed.teamId,
  });

  const now = input.now ?? new Date();
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
    },
  });
  if (!session) {
    throw new TeamCommunicationNotFoundError("training session not found");
  }
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
    throw new TeamCommunicationNotFoundError("training session no longer actionable");
  }

  const anchor = await resolveEventParticipationAnchor({
    tenantId: input.tenantId,
    teamId: parsed.teamId,
    teamSeasonId: parsed.teamSeasonId,
    event: { eventKind: "TRAINING", trainingSessionId: parsed.trainingSessionId },
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
    event: { eventKind: "TRAINING", trainingSessionId: parsed.trainingSessionId },
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
