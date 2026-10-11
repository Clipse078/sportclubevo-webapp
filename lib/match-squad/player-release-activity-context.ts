/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01C-R2 — resolve activity anchors for scoped releases.
 */

import type { EventStatus, EventType, TrainingSessionStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { PlayerReleaseValidationError } from "@/lib/match-squad/player-release-errors";

export type PlayerReleaseActivityContext =
  | {
      kind: "MATCH" | "TOURNAMENT" | "OTHER";
      eventId: string;
      trainingSessionId: null;
      teamId: string;
      teamSeasonId: string;
      activityDate: Date;
      activityLabel: string;
      activityEditable: boolean;
      readOnlyReason: string | null;
    }
  | {
      kind: "TRAINING";
      eventId: null;
      trainingSessionId: string;
      teamId: string;
      teamSeasonId: string;
      activityDate: Date;
      activityLabel: string;
      activityEditable: boolean;
      readOnlyReason: string | null;
    };

function isTerminalEventStatus(status: EventStatus): boolean {
  return status === "CANCELLED" || status === "POSTPONED";
}

function isTerminalTrainingStatus(status: TrainingSessionStatus): boolean {
  return status === "CANCELLED" || status === "POSTPONED";
}

function calendarDateFromInstant(instant: Date): Date {
  return new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()),
  );
}

export async function resolvePlayerReleaseActivityContext(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  eventId?: string | null;
  trainingSessionId?: string | null;
}): Promise<PlayerReleaseActivityContext> {
  const hasEvent = Boolean(input.eventId?.trim());
  const hasTraining = Boolean(input.trainingSessionId?.trim());
  if (hasEvent === hasTraining) {
    throw new PlayerReleaseValidationError(
      "Bitte genau einen Aktivitätsbezug (Event oder Training) angeben.",
      "INVALID_ACTIVITY",
    );
  }

  if (input.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: input.eventId, tenantId: input.tenantId },
      select: {
        id: true,
        type: true,
        status: true,
        title: true,
        startAt: true,
        teamId: true,
        teamSeasonId: true,
        seasonId: true,
      },
    });
    if (!event || !event.teamId) {
      throw new PlayerReleaseValidationError("Aktivität nicht gefunden.", "INVALID_ACTIVITY");
    }

    let teamSeasonId = event.teamSeasonId;
    if (!teamSeasonId && event.seasonId) {
      const resolved = await prisma.teamSeason.findFirst({
        where: { teamId: event.teamId, seasonId: event.seasonId },
        select: { id: true },
      });
      teamSeasonId = resolved?.id ?? null;
    }
    if (!teamSeasonId || teamSeasonId !== input.sourceTeamSeasonId) {
      throw new PlayerReleaseValidationError(
        "Aktivität gehört nicht zum Stammteam dieser Freigabe.",
        "INVALID_ACTIVITY",
      );
    }

    const editable = !isTerminalEventStatus(event.status);
    const typeLabel =
      event.type === "MATCH" ? "Spiel" : event.type === "TOURNAMENT" ? "Turnier" : "Termin";

    return {
      kind: event.type === "MATCH" ? "MATCH" : event.type === "TOURNAMENT" ? "TOURNAMENT" : "OTHER",
      eventId: event.id,
      trainingSessionId: null,
      teamId: event.teamId,
      teamSeasonId,
      activityDate: calendarDateFromInstant(event.startAt),
      activityLabel: `${typeLabel}: ${event.title}`,
      activityEditable: editable,
      readOnlyReason: editable ? null : "Abgesagter oder verschobener Termin — Freigabe schreibgeschützt.",
    };
  }

  const session = await prisma.trainingSession.findFirst({
    where: { id: input.trainingSessionId!, tenantId: input.tenantId },
    select: {
      id: true,
      status: true,
      date: true,
      startAt: true,
      teamSeasonId: true,
      trainingSeries: {
        select: {
          title: true,
          teamSeason: { select: { teamId: true } },
        },
      },
    },
  });
  if (!session) {
    throw new PlayerReleaseValidationError("Training nicht gefunden.", "INVALID_ACTIVITY");
  }
  if (session.teamSeasonId !== input.sourceTeamSeasonId) {
    throw new PlayerReleaseValidationError(
      "Training gehört nicht zum Stammteam dieser Freigabe.",
      "INVALID_ACTIVITY",
    );
  }

  const editable = !isTerminalTrainingStatus(session.status);
  const teamId = session.trainingSeries.teamSeason.teamId;

  return {
    kind: "TRAINING",
    eventId: null,
    trainingSessionId: session.id,
    teamId,
    teamSeasonId: session.teamSeasonId,
    activityDate: calendarDateFromInstant(session.date),
    activityLabel: `Training: ${session.trainingSeries.title}`,
    activityEditable: editable,
    readOnlyReason: editable ? null : "Abgesagtes Training — Freigabe schreibgeschützt.",
  };
}

export function assertActivityTypeSupported(type: EventType): void {
  if (type !== "MATCH" && type !== "TOURNAMENT" && type !== "OTHER") {
    throw new PlayerReleaseValidationError("Aktivitätstyp wird nicht unterstützt.", "INVALID_ACTIVITY");
  }
}
