/**
 * MATCH_SQUAD_PLAYER_AVAILABILITY-01D R2 — multi-player / multi-activity release planning.
 */

import { randomUUID } from "node:crypto";
import type { EventStatus, PlayerReleaseReason } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatPersonName } from "@/lib/communication/personalisation/formatters";
import { currentSeasonRosterPlayerSquadMemberWhere } from "@/lib/teams/player-squad-structural-filter";
import { PlayerReleaseValidationError } from "@/lib/match-squad/player-release-errors";
import { resolvePlayerReleaseActivityContext } from "@/lib/match-squad/player-release-activity-context";
import { loadPersonActivityConflictHints } from "@/lib/match-squad/person-activity-conflict-hints";
import { emitTargetedPlayerReleaseAwareness } from "@/lib/match-squad/player-release-awareness-producer";
import { createPlayerRelease } from "@/lib/match-squad/player-release-service";
import {
  resolvePlayerReleaseTargetTeams,
  type PlayerReleaseTargetEligibilityState,
} from "@/lib/match-squad/player-release-target-discovery";
import {
  activitySortKey,
  formatPlanningDateParts,
} from "@/lib/match-squad/player-release-planning-sort";

const PLANNING_HORIZON_DAYS = 56;
const TERMINAL_EVENT_STATUSES: EventStatus[] = ["CANCELLED", "POSTPONED"];

export type PlayerReleasePlanCombinationState = "VALID" | "WARNING" | "INVALID";

export type PlayerReleasePlanningPlayer = {
  personId: string;
  displayName: string;
};

export type PlayerReleasePlanningActivityCandidate = {
  eventId: string;
  eventType: "MATCH" | "TOURNAMENT";
  targetTeamSeasonId: string;
  targetTeamId: string;
  targetTeamLabel: string;
  startAt: string;
  dateGroupKey: string;
  dateLine: string;
  timeLine: string;
  headline: string;
  subline: string | null;
  locationLine: string | null;
  selectable: boolean;
  partialEligibilityNote: string | null;
};

export type PlayerReleasePlanningTargetTeam = {
  targetTeamSeasonId: string;
  targetTeamId: string;
  targetTeamLabel: string;
  activityCount: number;
  activities: PlayerReleasePlanningActivityCandidate[];
};

export type PlayerReleasePlanningSourceEventContext = {
  eventId: string;
  startAt: string;
  dateLine: string;
  timeLine: string;
  title: string;
  headline: string;
} | null;

export type PlayerReleasePlanningCandidatesResult = {
  players: PlayerReleasePlanningPlayer[];
  activitiesByDate: { dateGroupKey: string; dateLine: string; activities: PlayerReleasePlanningActivityCandidate[] }[];
  targetTeams: PlayerReleasePlanningTargetTeam[];
  sourceTeamContext: { label: string; lines: string[] };
  sourceEventContext: PlayerReleasePlanningSourceEventContext;
  planningMode: "MATCH_SOURCE" | "KADER";
};

export type PlayerReleasePlanActivityDefaults = {
  maxMinutes?: number | null;
  reason?: string;
};

export type PlayerReleasePlanCombination = {
  personId: string;
  personDisplayName: string;
  eventId: string;
  targetTeamSeasonId: string;
  state: PlayerReleasePlanCombinationState;
  message: string | null;
  maxMinutes: number | null;
  reason: PlayerReleaseReason;
};

export type PlayerReleasePlanReview = {
  playerCount: number;
  activityCount: number;
  validReleaseCount: number;
  invalidCombinationCount: number;
  warningCount: number;
  invalidNote: string | null;
  combinations: PlayerReleasePlanCombination[];
  activities: PlayerReleasePlanningActivityCandidate[];
};

export type PlayerReleasePlanCreateResult = {
  planId: string;
  createdReleaseIds: string[];
  review: PlayerReleasePlanReview;
};

function addDays(base: Date, days: number): Date {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function teamSeasonLabel(row: {
  displayName: string;
  shortName: string | null;
  team: { name: string; shortName: string | null };
}): string {
  return row.displayName || row.shortName || row.team.shortName || row.team.name;
}

function parseReason(value: string | undefined, fallback: PlayerReleaseReason): PlayerReleaseReason {
  const normalized = String(value ?? fallback).trim().toUpperCase();
  const allowed: PlayerReleaseReason[] = [
    "SPIELPRAXIS",
    "ENTWICKLUNG",
    "KADERAUSGLEICH",
    "TORHUETER_UNTERSTUETZUNG",
    "COMEBACK_BELASTUNGSAUFBAU",
    "ANDERE",
  ];
  return allowed.includes(normalized as PlayerReleaseReason)
    ? (normalized as PlayerReleaseReason)
    : fallback;
}

async function loadEligibleTargetsByPerson(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  personIds: string[];
}): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  await Promise.all(
    input.personIds.map(async (personId) => {
      const rows = await resolvePlayerReleaseTargetTeams({
        tenantId: input.tenantId,
        personId,
        sourceTeamSeasonId: input.sourceTeamSeasonId,
      });
      const eligible = new Set(
        rows.filter((row) => row.eligibilityState === "ELIGIBLE").map((row) => row.teamSeasonId),
      );
      map.set(personId, eligible);
    }),
  );
  return map;
}

export async function resolvePlayerReleasePlanningCandidates(input: {
  tenantId: string;
  sourceTeamSeasonId: string;
  personIds: string[];
  timezone: string;
  sourceEventId?: string;
}): Promise<PlayerReleasePlanningCandidatesResult> {
  const uniquePersonIds = [...new Set(input.personIds.map((id) => id.trim()).filter(Boolean))];
  if (uniquePersonIds.length === 0) {
    throw new PlayerReleaseValidationError("Bitte mindestens einen Spieler wählen.");
  }

  const rosterRows = await prisma.playerSquadMember.findMany({
    where: {
      ...currentSeasonRosterPlayerSquadMemberWhere(input.sourceTeamSeasonId),
      personId: { in: uniquePersonIds },
      person: { tenantId: input.tenantId },
    },
    select: {
      personId: true,
      person: {
        select: { firstName: true, lastName: true, displayName: true },
      },
    },
  });

  if (rosterRows.length !== uniquePersonIds.length) {
    throw new PlayerReleaseValidationError(
      "Ein oder mehrere Spieler sind nicht im aktuellen Saison-Kader.",
      "NOT_ROSTER_MEMBER",
    );
  }

  const players: PlayerReleasePlanningPlayer[] = rosterRows.map((row) => ({
    personId: row.personId,
    displayName: formatPersonName(row.person),
  }));

  const eligibleByPerson = await loadEligibleTargetsByPerson({
    tenantId: input.tenantId,
    sourceTeamSeasonId: input.sourceTeamSeasonId,
    personIds: uniquePersonIds,
  });

  const unionTargetTeamSeasonIds = new Set<string>();
  for (const set of eligibleByPerson.values()) {
    for (const id of set) unionTargetTeamSeasonIds.add(id);
  }

  const now = new Date();
  const horizonEnd = addDays(now, PLANNING_HORIZON_DAYS);

  const sourceEventId = input.sourceEventId?.trim() || null;

  const [targetTeamSeasons, events, sourceEvents, sourceTeamSeason, explicitSourceEvent] =
    await Promise.all([
    unionTargetTeamSeasonIds.size
      ? prisma.teamSeason.findMany({
          where: { id: { in: [...unionTargetTeamSeasonIds] } },
          select: {
            id: true,
            teamId: true,
            seasonId: true,
            displayName: true,
            shortName: true,
            team: { select: { name: true, shortName: true } },
          },
        })
      : Promise.resolve([]),
    unionTargetTeamSeasonIds.size
      ? prisma.teamSeason
          .findMany({
            where: { id: { in: [...unionTargetTeamSeasonIds] } },
            select: { teamId: true, seasonId: true },
          })
          .then((seasonRows) => {
            const teamIds = [...new Set(seasonRows.map((row) => row.teamId))];
            const seasonIds = [...new Set(seasonRows.map((row) => row.seasonId))];
            return prisma.event.findMany({
              where: {
                tenantId: input.tenantId,
                type: { in: ["MATCH", "TOURNAMENT"] },
                startAt: { gte: now, lte: horizonEnd },
                status: { notIn: TERMINAL_EVENT_STATUSES },
                OR: [
                  { teamSeasonId: { in: [...unionTargetTeamSeasonIds] } },
                  {
                    teamSeasonId: null,
                    teamId: { in: teamIds },
                    seasonId: { in: seasonIds },
                  },
                ],
              },
              select: {
                id: true,
                type: true,
                title: true,
                startAt: true,
                endAt: true,
                location: true,
                teamSeasonId: true,
                teamId: true,
                seasonId: true,
              },
              orderBy: { startAt: "asc" },
            });
          })
      : Promise.resolve([]),
    sourceEventId
      ? Promise.resolve([])
      : prisma.event.findMany({
          where: {
            tenantId: input.tenantId,
            teamSeasonId: input.sourceTeamSeasonId,
            type: "MATCH",
            startAt: { gte: now, lte: horizonEnd },
            status: { notIn: TERMINAL_EVENT_STATUSES },
          },
          select: { title: true, startAt: true },
          orderBy: { startAt: "asc" },
          take: 2,
        }),
    prisma.teamSeason.findFirst({
      where: { id: input.sourceTeamSeasonId },
      select: {
        displayName: true,
        shortName: true,
        team: { select: { name: true, shortName: true } },
      },
    }),
    sourceEventId
      ? prisma.event.findFirst({
          where: {
            id: sourceEventId,
            tenantId: input.tenantId,
            type: { in: ["MATCH", "TOURNAMENT"] },
          },
          select: { id: true, title: true, startAt: true, teamSeasonId: true, teamId: true },
        })
      : Promise.resolve(null),
  ]);

  const teamSeasonById = new Map(targetTeamSeasons.map((row) => [row.id, row]));
  const teamSeasonIdByTeamAndSeason = new Map(
    targetTeamSeasons.map((row) => [`${row.teamId}:${row.seasonId}`, row.id]),
  );

  const activities: PlayerReleasePlanningActivityCandidate[] = [];
  for (const event of events) {
    if (event.type !== "MATCH" && event.type !== "TOURNAMENT") {
      continue;
    }

    let resolvedTeamSeasonId = event.teamSeasonId;
    if (!resolvedTeamSeasonId && event.teamId && event.seasonId) {
      resolvedTeamSeasonId =
        teamSeasonIdByTeamAndSeason.get(`${event.teamId}:${event.seasonId}`) ?? null;
    }
    if (!resolvedTeamSeasonId || !unionTargetTeamSeasonIds.has(resolvedTeamSeasonId)) {
      continue;
    }

    const ts = teamSeasonById.get(resolvedTeamSeasonId);
    if (!ts) continue;

    const eligiblePlayers = uniquePersonIds.filter((personId) =>
      eligibleByPerson.get(personId)?.has(resolvedTeamSeasonId),
    );
    const { dateGroupKey, dateLine, timeLine } = formatPlanningDateParts(event.startAt, input.timezone);
    const targetTeamLabel = teamSeasonLabel(ts);
    const typeLabel = event.type === "MATCH" ? "Spiel" : "Turnier";

    activities.push({
      eventId: event.id,
      eventType: event.type,
      targetTeamSeasonId: resolvedTeamSeasonId,
      targetTeamId: ts.teamId,
      targetTeamLabel,
      startAt: event.startAt.toISOString(),
      dateGroupKey,
      dateLine,
      timeLine,
      headline: event.title?.trim() || `${targetTeamLabel} · ${typeLabel}`,
      subline: event.title?.trim() ? `${targetTeamLabel} · ${typeLabel}` : null,
      locationLine: event.location?.trim() || null,
      selectable: eligiblePlayers.length > 0,
      partialEligibilityNote:
        eligiblePlayers.length > 0 && eligiblePlayers.length < uniquePersonIds.length
          ? `${uniquePersonIds.length - eligiblePlayers.length} Spieler können diesen Einsatz nicht unterstützen.`
          : null,
    });
  }

  const sourceStartAt =
    explicitSourceEvent &&
    (explicitSourceEvent.teamSeasonId === input.sourceTeamSeasonId ||
      explicitSourceEvent.teamSeasonId == null)
      ? explicitSourceEvent.startAt
      : null;

  activities.sort((a, b) => {
    const [tierA, timeA] = activitySortKey(new Date(a.startAt), sourceStartAt, input.timezone);
    const [tierB, timeB] = activitySortKey(new Date(b.startAt), sourceStartAt, input.timezone);
    if (tierA !== tierB) return tierA - tierB;
    if (timeA !== timeB) return timeA - timeB;
    return a.targetTeamLabel.localeCompare(b.targetTeamLabel, "de");
  });

  const grouped = new Map<string, PlayerReleasePlanningActivityCandidate[]>();
  for (const activity of activities) {
    const list = grouped.get(activity.dateGroupKey) ?? [];
    list.push(activity);
    grouped.set(activity.dateGroupKey, list);
  }

  const activitiesByDate = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateGroupKey, list]) => ({
      dateGroupKey,
      dateLine: list[0]?.dateLine ?? dateGroupKey,
      activities: list.sort((a, b) => {
        const [tierA, timeA] = activitySortKey(new Date(a.startAt), sourceStartAt, input.timezone);
        const [tierB, timeB] = activitySortKey(new Date(b.startAt), sourceStartAt, input.timezone);
        if (tierA !== tierB) return tierA - tierB;
        return timeA - timeB;
      }),
    }));

  const teamMap = new Map<string, PlayerReleasePlanningActivityCandidate[]>();
  for (const activity of activities) {
    const list = teamMap.get(activity.targetTeamSeasonId) ?? [];
    list.push(activity);
    teamMap.set(activity.targetTeamSeasonId, list);
  }

  const targetTeams: PlayerReleasePlanningTargetTeam[] = [...teamMap.entries()]
    .map(([targetTeamSeasonId, teamActivities]) => {
      const sorted = [...teamActivities].sort((a, b) => {
        const [tierA, timeA] = activitySortKey(new Date(a.startAt), sourceStartAt, input.timezone);
        const [tierB, timeB] = activitySortKey(new Date(b.startAt), sourceStartAt, input.timezone);
        if (tierA !== tierB) return tierA - tierB;
        return timeA - timeB;
      });
      const first = sorted[0];
      return {
        targetTeamSeasonId,
        targetTeamId: first?.targetTeamId ?? "",
        targetTeamLabel: first?.targetTeamLabel ?? targetTeamSeasonId,
        activityCount: sorted.length,
        activities: sorted,
      };
    })
    .sort((a, b) => {
      const aStart = a.activities[0]?.startAt;
      const bStart = b.activities[0]?.startAt;
      if (aStart && bStart) {
        const [tierA, timeA] = activitySortKey(new Date(aStart), sourceStartAt, input.timezone);
        const [tierB, timeB] = activitySortKey(new Date(bStart), sourceStartAt, input.timezone);
        if (tierA !== tierB) return tierA - tierB;
        if (timeA !== timeB) return timeA - timeB;
      }
      return a.targetTeamLabel.localeCompare(b.targetTeamLabel, "de");
    });

  const sourceLabel = sourceTeamSeason ? teamSeasonLabel(sourceTeamSeason) : "Stammteam";
  const sourceEventContext: PlayerReleasePlanningSourceEventContext = explicitSourceEvent
    ? (() => {
        const { dateLine, timeLine } = formatPlanningDateParts(
          explicitSourceEvent.startAt,
          input.timezone,
        );
        return {
          eventId: explicitSourceEvent.id,
          startAt: explicitSourceEvent.startAt.toISOString(),
          dateLine,
          timeLine,
          title: explicitSourceEvent.title,
          headline: `${sourceLabel} · ${dateLine} · ${timeLine}`,
        };
      })()
    : null;

  const sourceTeamContext = {
    label: sourceLabel,
    lines: sourceEventContext
      ? [
          `Ausgehend von: ${sourceEventContext.headline}`,
          sourceEventContext.title ? `vs ${sourceEventContext.title}` : "",
        ].filter(Boolean)
      : sourceEvents.map((event) => {
          const { dateLine, timeLine } = formatPlanningDateParts(event.startAt, input.timezone);
          return `Eigenes Spiel: ${dateLine} · ${timeLine} · ${event.title}`;
        }),
  };

  return {
    players,
    activitiesByDate,
    targetTeams,
    sourceTeamContext,
    sourceEventContext,
    planningMode: sourceEventContext ? "MATCH_SOURCE" : "KADER",
  };
}

async function hasDuplicateActiveRelease(input: {
  tenantId: string;
  personId: string;
  sourceTeamSeasonId: string;
  targetTeamSeasonId: string;
  eventId: string;
}): Promise<boolean> {
  const existing = await prisma.playerRelease.findFirst({
    where: {
      tenantId: input.tenantId,
      personId: input.personId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      targetTeamSeasonId: input.targetTeamSeasonId,
      scope: "ACTIVITY",
      eventId: input.eventId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return Boolean(existing);
}

export async function buildPlayerReleasePlan(input: {
  tenantId: string;
  teamId: string;
  sourceTeamSeasonId: string;
  personIds: string[];
  eventIds: string[];
  timezone: string;
  sourceEventId?: string;
  defaultReason?: string;
  activityDefaults?: Record<string, PlayerReleasePlanActivityDefaults>;
  excludedCombinations?: { personId: string; eventId: string }[];
  combinationOverrides?: {
    personId: string;
    eventId: string;
    maxMinutes?: number | null;
    reason?: string;
  }[];
}): Promise<PlayerReleasePlanReview> {
  const candidates = await resolvePlayerReleasePlanningCandidates({
    tenantId: input.tenantId,
    sourceTeamSeasonId: input.sourceTeamSeasonId,
    personIds: input.personIds,
    timezone: input.timezone,
    sourceEventId: input.sourceEventId,
  });

  const activityById = new Map<string, PlayerReleasePlanningActivityCandidate>();
  for (const group of candidates.activitiesByDate) {
    for (const activity of group.activities) {
      activityById.set(activity.eventId, activity);
    }
  }

  const selectedEventIds = [...new Set(input.eventIds.map((id) => id.trim()).filter(Boolean))];
  if (selectedEventIds.length === 0) {
    throw new PlayerReleaseValidationError("Bitte mindestens einen Einsatz wählen.");
  }

  const selectedActivities = selectedEventIds.map((id) => activityById.get(id)).filter(Boolean) as PlayerReleasePlanningActivityCandidate[];
  if (selectedActivities.length !== selectedEventIds.length) {
    throw new PlayerReleaseValidationError(
      "Ein oder mehrere Einsätze sind nicht verfügbar.",
      "INVALID_ACTIVITY",
    );
  }

  const eligibleByPerson = await loadEligibleTargetsByPerson({
    tenantId: input.tenantId,
    sourceTeamSeasonId: input.sourceTeamSeasonId,
    personIds: candidates.players.map((p) => p.personId),
  });

  const excluded = new Set(
    (input.excludedCombinations ?? []).map((row) => `${row.personId}:${row.eventId}`),
  );
  const overrideByKey = new Map(
    (input.combinationOverrides ?? []).map((row) => [`${row.personId}:${row.eventId}`, row]),
  );

  const defaultReason = parseReason(input.defaultReason, "SPIELPRAXIS");
  const combinations: PlayerReleasePlanCombination[] = [];

  for (const player of candidates.players) {
    for (const activity of selectedActivities) {
      const key = `${player.personId}:${activity.eventId}`;
      if (excluded.has(key)) {
        continue;
      }

      const activityDefault = input.activityDefaults?.[activity.eventId];
      const override = overrideByKey.get(key);
      const reason = parseReason(override?.reason ?? activityDefault?.reason, defaultReason);
      const maxMinutes =
        override?.maxMinutes !== undefined
          ? override.maxMinutes
          : activityDefault?.maxMinutes !== undefined
            ? activityDefault.maxMinutes
            : null;

      let state: PlayerReleasePlanCombinationState = "VALID";
      let message: string | null = null;

      const personEligible = eligibleByPerson
        .get(player.personId)
        ?.has(activity.targetTeamSeasonId);
      if (!personEligible) {
        state = "INVALID";
        message = "Spieler ist für dieses Zielteam nicht als passend erkannt.";
      } else {
        try {
          await resolvePlayerReleaseActivityContext({
            tenantId: input.tenantId,
            sourceTeamSeasonId: input.sourceTeamSeasonId,
            targetTeamSeasonId: activity.targetTeamSeasonId,
            eventId: activity.eventId,
          });
        } catch {
          state = "INVALID";
          message = "Einsatz ist nicht mehr verfügbar.";
        }
      }

      if (state === "VALID") {
        const duplicate = await hasDuplicateActiveRelease({
          tenantId: input.tenantId,
          personId: player.personId,
          sourceTeamSeasonId: input.sourceTeamSeasonId,
          targetTeamSeasonId: activity.targetTeamSeasonId,
          eventId: activity.eventId,
        });
        if (duplicate) {
          state = "INVALID";
          message = "Für diesen Einsatz besteht bereits eine aktive Freigabe.";
        }
      }

      if (state === "VALID") {
        const conflicts = await loadPersonActivityConflictHints({
          tenantId: input.tenantId,
          personId: player.personId,
          targetEventId: activity.eventId,
          targetStartAt: new Date(activity.startAt),
          targetEndAt: null,
        });
        const hard = conflicts.some((hint) => hint.level === "HARD");
        if (hard) {
          state = "WARNING";
          message = conflicts.find((hint) => hint.level === "HARD")?.message ?? "Terminkonflikt";
        } else if (conflicts.some((hint) => hint.level === "WARNING")) {
          state = "WARNING";
          message =
            conflicts.find((hint) => hint.level === "WARNING")?.message ?? "Hinweis prüfen";
        }
      }

      combinations.push({
        personId: player.personId,
        personDisplayName: player.displayName,
        eventId: activity.eventId,
        targetTeamSeasonId: activity.targetTeamSeasonId,
        state,
        message,
        maxMinutes,
        reason,
      });
    }
  }

  const validReleaseCount = combinations.filter((row) => row.state === "VALID").length;
  const invalidCombinationCount = combinations.filter((row) => row.state === "INVALID").length;
  const warningCount = combinations.filter((row) => row.state === "WARNING").length;

  const totalPossible = candidates.players.length * selectedActivities.length;
  const invalidNote =
    invalidCombinationCount > 0
      ? `${invalidCombinationCount} Kombination${invalidCombinationCount === 1 ? "" : "en"} ist nicht möglich.`
      : null;

  return {
    playerCount: candidates.players.length,
    activityCount: selectedActivities.length,
    validReleaseCount,
    invalidCombinationCount,
    warningCount,
    invalidNote,
    combinations,
    activities: selectedActivities,
  };
}

export async function createPlayerReleasePlan(input: {
  tenantId: string;
  teamId: string;
  sourceTeamSeasonId: string;
  actorUserId: string;
  personIds: string[];
  eventIds: string[];
  timezone: string;
  defaultReason?: string;
  activityDefaults?: Record<string, PlayerReleasePlanActivityDefaults>;
  excludedCombinations?: { personId: string; eventId: string }[];
  combinationOverrides?: {
    personId: string;
    eventId: string;
    maxMinutes?: number | null;
    reason?: string;
  }[];
}): Promise<PlayerReleasePlanCreateResult> {
  const review = await buildPlayerReleasePlan(input);
  if (review.validReleaseCount === 0) {
    throw new PlayerReleaseValidationError(
      "Keine gültigen Freigaben in diesem Plan.",
      "EMPTY_PLAN",
    );
  }

  const planId = randomUUID();
  const burstKey = `plan:${planId}`;
  const validCombinations = review.combinations.filter((row) => row.state !== "INVALID");

  const createdReleaseIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const combo of validCombinations) {
      const activity = review.activities.find((row) => row.eventId === combo.eventId);
      if (!activity) continue;

      const release = await createPlayerRelease({
        tenantId: input.tenantId,
        teamId: input.teamId,
        sourceTeamSeasonId: input.sourceTeamSeasonId,
        actorUserId: input.actorUserId,
        personId: combo.personId,
        targetTeamSeasonId: combo.targetTeamSeasonId,
        scope: "ACTIVITY",
        eventId: combo.eventId,
        maxMinutes: combo.maxMinutes,
        reason: combo.reason,
        awarenessBurstKey: `${burstKey}:${activity.targetTeamSeasonId}:${activity.eventId}`,
        targetEventId: activity.eventId,
        skipTargetAwareness: true,
        transactionClient: tx,
      });
      ids.push(release.id);
    }
    return ids;
  });

  const awarenessGroups = new Map<string, { targetTeamSeasonId: string; eventId: string }>();
  for (const activity of review.activities) {
    awarenessGroups.set(`${activity.targetTeamSeasonId}:${activity.eventId}`, {
      targetTeamSeasonId: activity.targetTeamSeasonId,
      eventId: activity.eventId,
    });
  }

  for (const group of awarenessGroups.values()) {
    const hasReleaseForGroup = validCombinations.some(
      (row) =>
        row.eventId === group.eventId && row.targetTeamSeasonId === group.targetTeamSeasonId,
    );
    if (!hasReleaseForGroup) continue;

    void emitTargetedPlayerReleaseAwareness({
      tenantId: input.tenantId,
      sourceTeamSeasonId: input.sourceTeamSeasonId,
      targetTeamSeasonId: group.targetTeamSeasonId,
      targetEventId: group.eventId,
      actorUserId: input.actorUserId,
      awarenessBurstKey: `${burstKey}:${group.targetTeamSeasonId}:${group.eventId}`,
    });
  }

  return { planId, createdReleaseIds, review };
}

export type { PlayerReleaseTargetEligibilityState };
