/**
 * Read-only FCA aggregate for SCE-EVENTS-AUDIENCE-01 closure (no mutations).
 */
import { prisma } from "@/lib/db/prisma";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";
import {
  clubEventEffectiveEndAt,
  isClubEventRelevantForParticipationAttention,
} from "@/lib/events/domain-audience/club-event-relevance";
import { listParticipationSubjectPersonIds } from "@/lib/participation/participation-audience-resolution";
import { resolveClubEventParticipationAnchor } from "@/lib/events/domain-audience/club-event-participation-anchor";
import { evaluateClubEventParticipationOperationalAttention } from "@/lib/events/operational-attention/club-event-participation-attention-source";

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

  const events = await prisma.event.findMany({
    where: {
      tenantId: tenant.id,
      type: "OTHER",
      status: { in: ["SCHEDULED", "LIVE"] },
    },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      type: true,
      participationResponseDueAt: true,
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

  for (const event of events) {
    if (clubEventEffectiveEndAt(event).getTime() < now.getTime()) continue;
    upcoming += 1;

    if (
      !isParticipationResponseRequested({
        participationResponseDueAt: event.participationResponseDueAt,
      })
    ) {
      continue;
    }
    activeParticipation += 1;

    const anchor = await resolveClubEventParticipationAnchor({
      tenantId: tenant.id,
      eventId: event.id,
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
      isClubEventRelevantForParticipationAttention({
        type: event.type,
        status: event.status,
        startAt: event.startAt,
        endAt: event.endAt,
        now,
        participationResponseDueAt: event.participationResponseDueAt,
      }) &&
      notResponded.length > 0
    ) {
      attentionItems += 1;
      totalOutstanding += notResponded.length;
    }
  }

  const attentionSample = await evaluateClubEventParticipationOperationalAttention({
    tenantId: tenant.id,
    userId: "fca-readonly-aggregate",
    permissionKeys: new Set(["events.view", "events.manage"]),
    now,
  });

  console.log(
    JSON.stringify(
      {
        TENANT: "fca",
        CANONICAL_ACTIVATION: "Event.participationResponseDueAt != null",
        POPULATION: "resolveClubEventInviteePersonIds (live dynamic expansion)",
        UPCOMING_CLUB_EVENTS: upcoming,
        ACTIVE_PARTICIPATION_REQUESTS: activeParticipation,
        AGGREGATE_YES: aggregateYes,
        AGGREGATE_NO: aggregateNo,
        AGGREGATE_MAYBE: aggregateMaybe,
        AGGREGATE_NOT_RESPONDED: aggregateNotResponded,
        ATTENTION_ITEMS_WITH_OUTSTANDING: attentionItems,
        TOTAL_OUTSTANDING_SUBJECTS: totalOutstanding,
        ATTENTION_EVAL_SAMPLE_COUNT: attentionSample.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
