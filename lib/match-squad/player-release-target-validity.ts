/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D — whether an ACTIVE PlayerRelease authorizes a target activity.
 */

import type { PlayerReleaseScope, PlayerReleaseStatus } from "@prisma/client";
import { isPlayerReleaseOperationallyActive } from "@/lib/match-squad/player-release-lifecycle";

function dateKeyFromDbDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateKeyFromInstant(value: Date, _timezone: string): string {
  return value.toISOString().slice(0, 10);
}

export function isPlayerReleaseValidForTargetActivity(input: {
  release: {
    status: PlayerReleaseStatus;
    scope: PlayerReleaseScope;
    targetTeamSeasonId: string;
    eventId: string | null;
    trainingSessionId: string | null;
    validFrom: Date;
    validUntil: Date;
  };
  targetTeamSeasonId: string;
  targetEventId: string;
  targetEventType: "MATCH" | "TOURNAMENT";
  targetActivityStartAt: Date;
  timezone: string;
}): boolean {
  if (input.release.status !== "ACTIVE") {
    return false;
  }
  if (input.release.targetTeamSeasonId !== input.targetTeamSeasonId) {
    return false;
  }
  if (
    !isPlayerReleaseOperationallyActive({
      status: input.release.status,
      validFrom: input.release.validFrom,
      validUntil: input.release.validUntil,
      timezone: input.timezone,
    })
  ) {
    return false;
  }

  const activityKey = dateKeyFromInstant(input.targetActivityStartAt, input.timezone);
  const fromKey = dateKeyFromDbDate(input.release.validFrom);
  const untilKey = dateKeyFromDbDate(input.release.validUntil);
  if (activityKey < fromKey || activityKey > untilKey) {
    return false;
  }

  if (input.release.scope === "PERIOD") {
    return true;
  }

  if (input.release.trainingSessionId) {
    return false;
  }

  if (input.targetEventType !== "MATCH" && input.targetEventType !== "TOURNAMENT") {
    return false;
  }

  return true;
}
