/**
 * Read-only FCA aggregate for SCE-SPIELBETRIEB-AUDIENCE-01 closure (no mutations).
 */
import type { EventStatus, EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isParticipationResponseRequested } from "@/lib/participation/participation-response-requested";

const MATCH_TOURNAMENT: EventType[] = ["MATCH", "TOURNAMENT"];
const ACTIONABLE_STATUSES: EventStatus[] = ["SCHEDULED", "LIVE"];

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

  const baseWhere = {
    tenantId: tenant.id,
    type: { in: MATCH_TOURNAMENT },
    startAt: { gte: now },
    status: { in: ACTIONABLE_STATUSES },
    teamSeasonId: { not: null },
  };

  const upcoming = await prisma.event.count({ where: baseWhere });
  const activeParticipation = await prisma.event.count({
    where: { ...baseWhere, participationResponseDueAt: { not: null } },
  });

  const activeEvents = await prisma.event.findMany({
    where: { ...baseWhere, participationResponseDueAt: { not: null } },
    select: {
      id: true,
      teamId: true,
      participationResponseDueAt: true,
      _count: {
        select: {
          participationResponses: true,
        },
      },
    },
    take: 50,
  });

  console.log(
    JSON.stringify(
      {
        FCA_UPCOMING_MATCH_TOURNAMENT: upcoming,
        FCA_ACTIVE_PARTICIPATION_REQUEST_EVENTS: activeParticipation,
        WOULD_FALSE_ATTENTION_IF_UNGATED: upcoming - activeParticipation,
        CANONICAL_ACTIVATION: "participationResponseDueAt != null",
        ACTIVE_EVENTS_SAMPLE: activeEvents.map((e) => ({
          eventId: e.id,
          teamId: e.teamId,
          dueAtSet: isParticipationResponseRequested({
            participationResponseDueAt: e.participationResponseDueAt,
          }),
          responseRowCount: e._count.participationResponses,
        })),
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
