/**
 * Read-only FCA aggregate for SCE-TRAINING-AUDIENCE-01 closure (no mutations).
 */
import { prisma } from "@/lib/db/prisma";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";
import {
  isTrainingSessionRelevantForParticipationAttention,
  trainingSessionEffectiveStartAt,
} from "@/lib/training/domain-audience/training-session-relevance";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import { resolveEventParticipationAnchor } from "@/lib/communication/event/event-participation-anchor";

async function main() {
  const now = new Date();
  const tenant = await prisma.tenant.findFirst({
    where: { key: "fca" },
    select: { id: true },
  });
  if (!tenant) {
    console.log(JSON.stringify({ error: "fca tenant not found" }, null, 2));
    return;
  }

  const sessions = await prisma.trainingSession.findMany({
    where: {
      tenantId: tenant.id,
      status: "SCHEDULED",
    },
    select: {
      id: true,
      startAt: true,
      overrideStartAt: true,
      status: true,
      teamSeasonId: true,
      participationResponseDueAt: true,
      teamSeason: { select: { teamId: true } },
    },
    take: 500,
  });

  let upcoming = 0;
  let activeParticipation = 0;
  let attentionItems = 0;
  let totalOutstanding = 0;
  let aggregateYes = 0;
  let aggregateNo = 0;
  let aggregateMaybe = 0;
  let aggregateNotResponded = 0;

  for (const session of sessions) {
    const effectiveStart = trainingSessionEffectiveStartAt({
      startAt: session.startAt,
      overrideStartAt: session.overrideStartAt,
    });
    if (effectiveStart.getTime() < now.getTime()) continue;
    upcoming += 1;

    if (
      !isParticipationResponseRequested({
        participationResponseDueAt: session.participationResponseDueAt,
      })
    ) {
      continue;
    }
    activeParticipation += 1;

    const teamId = session.teamSeason.teamId;
    const anchor = await resolveEventParticipationAnchor({
      tenantId: tenant.id,
      teamId,
      teamSeasonId: session.teamSeasonId,
      event: { eventKind: "TRAINING", trainingSessionId: session.id },
    });

    const [yes, no, maybe, notResponded] = await Promise.all([
      listParticipationSubjectPersonIds({ anchor, preset: "ACCEPTED_ONLY" }),
      listParticipationSubjectPersonIds({ anchor, preset: "DECLINED_ONLY" }),
      listParticipationSubjectPersonIds({ anchor, preset: "MAYBE_ONLY" }),
      listParticipationSubjectPersonIds({ anchor, preset: "NOT_RESPONDED" }),
    ]);
    aggregateYes += yes.length;
    aggregateNo += no.length;
    aggregateMaybe += maybe.length;
    aggregateNotResponded += notResponded.length;

    if (
      isTrainingSessionRelevantForParticipationAttention({
        status: session.status,
        startAt: session.startAt,
        overrideStartAt: session.overrideStartAt,
        now,
        participationResponseDueAt: session.participationResponseDueAt,
      }) &&
      notResponded.length > 0
    ) {
      attentionItems += 1;
      totalOutstanding += notResponded.length;
    }
  }

  console.log(
    JSON.stringify(
      {
        FCA_UPCOMING_TRAINING_SESSIONS: upcoming,
        FCA_ACTIVE_PARTICIPATION_REQUEST_SESSIONS: activeParticipation,
        FCA_AGGREGATE_YES: aggregateYes,
        FCA_AGGREGATE_NO: aggregateNo,
        FCA_AGGREGATE_MAYBE: aggregateMaybe,
        FCA_AGGREGATE_NOT_RESPONDED: aggregateNotResponded,
        FCA_ATTENTION_ITEMS_NOW: attentionItems,
        FCA_TOTAL_OUTSTANDING_COUNT: totalOutstanding,
        WOULD_FALSE_ATTENTION_IF_UNGATED: upcoming - activeParticipation,
        CANONICAL_ACTIVATION: "TrainingSession.participationResponseDueAt != null",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
