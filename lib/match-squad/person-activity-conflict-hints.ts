/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D — lightweight person/time feasibility hints (not a full calendar engine).
 */

import { prisma } from "@/lib/db/prisma";

export type PersonActivityConflictLevel = "HARD" | "WARNING" | "INFO";

export type PersonActivityConflictHint = {
  level: PersonActivityConflictLevel;
  code: string;
  message: string;
};

function eventEffectiveEnd(startAt: Date, endAt: Date | null): Date {
  if (endAt && endAt.getTime() > startAt.getTime()) {
    return endAt;
  }
  return new Date(startAt.getTime() + 90 * 60 * 1000);
}

function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export async function loadPersonActivityConflictHints(input: {
  tenantId: string;
  personId: string;
  targetEventId: string;
  targetStartAt: Date;
  targetEndAt: Date | null;
}): Promise<PersonActivityConflictHint[]> {
  const hints: PersonActivityConflictHint[] = [];
  const targetEnd = eventEffectiveEnd(input.targetStartAt, input.targetEndAt);

  const dayStart = new Date(input.targetStartAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const selections = await prisma.matchSquadMember.findMany({
    where: {
      personId: input.personId,
      matchSquad: {
        tenantId: input.tenantId,
        eventId: { not: input.targetEventId },
        event: {
          startAt: { gte: dayStart, lt: dayEnd },
          status: { not: "CANCELLED" },
        },
      },
    },
    select: {
      matchSquad: {
        select: {
          eventId: true,
          teamSeason: {
            select: {
              displayName: true,
              shortName: true,
              team: { select: { name: true, shortName: true } },
            },
          },
          event: {
            select: {
              title: true,
              startAt: true,
              endAt: true,
              type: true,
            },
          },
        },
      },
    },
  });

  for (const row of selections) {
    const squad = row.matchSquad;
    const event = squad.event;
    const otherEnd = eventEffectiveEnd(event.startAt, event.endAt);
    const teamLabel =
      squad.teamSeason.displayName ||
      squad.teamSeason.shortName ||
      squad.teamSeason.team.shortName ||
      squad.teamSeason.team.name;

    if (
      intervalsOverlap(input.targetStartAt, targetEnd, event.startAt, otherEnd)
    ) {
      hints.push({
        level: "HARD",
        code: "OVERLAPPING_ACTIVITY",
        message: `Zeitliche Überschneidung mit Aufgebot (${teamLabel}: ${event.title}).`,
      });
    } else {
      hints.push({
        level: "INFO",
        code: "SAME_DAY_OTHER_SQUAD",
        message: `Bereits für ein anderes Aufgebot am selben Tag vorgesehen (${teamLabel}).`,
      });
    }
  }

  return hints;
}
