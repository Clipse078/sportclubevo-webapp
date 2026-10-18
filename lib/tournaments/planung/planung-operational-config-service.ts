/**
 * Persist operational Spielplan settings (timing + breaks) without regenerating assignments.
 */

import { prisma } from "@/lib/db/prisma";
import {
  parseTenantLocalDateTimeInput,
  resolveTenantEventTimezone,
  utcInstantToDateTimeLocalValue,
} from "@/lib/events/tenant-local-datetime";
import { resolveComposerBreakDateTimes } from "@/lib/tournaments/composer/tournament-composer-planner-breaks";
import { requireTenantOrganisedTournament } from "@/lib/tournament-scheduling/internal/require-tenant-organised-tournament";
import {
  createTournamentBreak,
  deleteTournamentBreak,
  updateTournamentBreak,
} from "@/lib/tournament-scheduling/tournament-break-service";
import { updateWorkingTournamentScheduleVersionTiming } from "@/lib/tournament-scheduling/schedule-version-service";
import { TournamentSchedulingError } from "@/lib/tournament-scheduling/errors";
import {
  normalizeStoredRoundRobinMeetingsForHomeAwayToggle,
  normalizeStoredSmartMixTargetForHomeAwayToggle,
} from "./planung-round-robin-home-away";

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 1 || !Number.isInteger(value)) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_GENERATION_INVALID",
      `${field} muss eine positive Ganzzahl sein.`,
    );
  }
}

export async function updatePlanungFixtureHomeAwayRelevance(params: {
  tenantId: string;
  tournamentId: string;
  fixtureHomeAwayRelevance: "ON" | "OFF";
  previousFixtureHomeAwayRelevance: "ON" | "OFF";
}): Promise<void> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);
  const existing = await prisma.tournamentCompetitionConfiguration.findFirst({
    where: { tenantId: params.tenantId, eventId: params.tournamentId },
    select: { roundRobinMeetingsPerOpponent: true },
  });
  const storedMeetings = existing?.roundRobinMeetingsPerOpponent ?? 1;
  const roundRobinMeetingsPerOpponent = normalizeStoredRoundRobinMeetingsForHomeAwayToggle(
    storedMeetings,
    params.previousFixtureHomeAwayRelevance,
    params.fixtureHomeAwayRelevance,
  );

  const updated = await prisma.tournamentCompetitionConfiguration.updateMany({
    where: { tenantId: params.tenantId, eventId: params.tournamentId },
    data: {
      fixtureHomeAwayRelevance: params.fixtureHomeAwayRelevance,
      roundRobinMeetingsPerOpponent,
    },
  });
  if (updated.count === 0) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_GENERATION_INVALID",
      "Turnierkonfiguration fehlt — Heim-/Auswärtseinstellung konnte nicht gespeichert werden.",
    );
  }

  const groupPhases = await prisma.tournamentPhase.findMany({
    where: {
      tenantId: params.tenantId,
      eventId: params.tournamentId,
      phaseType: "GROUP_MIX",
      groupMixStrategy: "SMART_MIX",
    },
    select: { id: true, smartMixTargetMatchesPerParticipant: true },
  });
  for (const phase of groupPhases) {
    const storedTarget = phase.smartMixTargetMatchesPerParticipant ?? 1;
    const smartMixTargetMatchesPerParticipant = normalizeStoredSmartMixTargetForHomeAwayToggle(
      storedTarget,
      params.previousFixtureHomeAwayRelevance,
      params.fixtureHomeAwayRelevance,
    );
    if (smartMixTargetMatchesPerParticipant !== storedTarget) {
      await prisma.tournamentPhase.update({
        where: { id: phase.id },
        data: { smartMixTargetMatchesPerParticipant },
      });
    }
  }
}

export async function updatePlanungOperationalTiming(params: {
  tenantId: string;
  tournamentId: string;
  scheduleVersionId: string;
  expectedRevision?: number;
  matchDurationMinutes: number;
  transitionMinutes: number;
}): Promise<{ revision: number }> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);
  assertPositiveInteger(params.matchDurationMinutes, "Spieldauer");
  if (!Number.isFinite(params.transitionMinutes) || params.transitionMinutes < 0) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_GENERATION_INVALID",
      "Wechselzeit muss null oder eine positive Zahl sein.",
    );
  }

  const updated = await updateWorkingTournamentScheduleVersionTiming(
    params.tenantId,
    params.scheduleVersionId,
    {
      matchDurationMinutes: params.matchDurationMinutes,
      transitionMinutes: Math.floor(params.transitionMinutes),
    },
    { expectedRevision: params.expectedRevision },
  );

  return { revision: updated.revision };
}

export type PlanungBreakDraftInput = {
  label?: string | null;
  startLocalTime: string;
  durationMinutes: number;
  scope: "ALL_PITCHES" | "SELECTED_PITCHES";
  tournamentPitchIds?: string[];
};

async function resolveBreakInstants(
  tenantId: string,
  tournamentId: string,
  draft: PlanungBreakDraftInput,
): Promise<{ startAt: Date; endAt: Date }> {
  const event = await prisma.event.findFirstOrThrow({
    where: { id: tournamentId, tenantId, type: "TOURNAMENT" },
    select: { startAt: true, tenant: { select: { timezone: true } } },
  });
  if (!event.startAt) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_GENERATION_INVALID",
      "Turnierstart fehlt — Pause kann nicht gespeichert werden.",
    );
  }

  const tenantTimeZone = resolveTenantEventTimezone(event.tenant?.timezone);
  const tournamentStartLocal = utcInstantToDateTimeLocalValue(event.startAt, tenantTimeZone);
  const interval = resolveComposerBreakDateTimes(
    {
      localId: "planung-break",
      label: draft.label ?? "Pause",
      startLocalTime: draft.startLocalTime,
      durationMinutes: draft.durationMinutes,
      scope: draft.scope,
      tournamentPitchLocalIds: [],
      fieldSelectionAdvanced: draft.scope === "SELECTED_PITCHES",
    },
    tournamentStartLocal,
    tenantTimeZone,
  );
  if (!interval) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_GENERATION_INVALID",
      "Ungültige Pausenzeit.",
    );
  }

  const startAt = parseTenantLocalDateTimeInput(interval.startAt, tenantTimeZone);
  const endAt = parseTenantLocalDateTimeInput(interval.endAt, tenantTimeZone);
  if (!startAt || !endAt) {
    throw new TournamentSchedulingError(
      "TOURNAMENT_GENERATION_INVALID",
      "Ungültige Pausenzeit.",
    );
  }
  return { startAt, endAt };
}

export async function createPlanungOperationalBreak(params: {
  tenantId: string;
  tournamentId: string;
  draft: PlanungBreakDraftInput;
}): Promise<void> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);
  assertPositiveInteger(params.draft.durationMinutes, "Pausendauer");
  const { startAt, endAt } = await resolveBreakInstants(
    params.tenantId,
    params.tournamentId,
    params.draft,
  );
  const scope = params.draft.scope === "SELECTED_PITCHES" ? "SELECTED_PITCHES" : "ALL_PITCHES";
  await createTournamentBreak(params.tenantId, params.tournamentId, {
    label: params.draft.label,
    startAt,
    endAt,
    scope,
    tournamentPitchIds: scope === "SELECTED_PITCHES" ? params.draft.tournamentPitchIds : undefined,
  });
}

export async function updatePlanungOperationalBreak(params: {
  tenantId: string;
  tournamentId: string;
  breakId: string;
  draft: PlanungBreakDraftInput;
}): Promise<void> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);
  assertPositiveInteger(params.draft.durationMinutes, "Pausendauer");
  const { startAt, endAt } = await resolveBreakInstants(
    params.tenantId,
    params.tournamentId,
    params.draft,
  );
  const scope = params.draft.scope === "SELECTED_PITCHES" ? "SELECTED_PITCHES" : "ALL_PITCHES";
  await updateTournamentBreak(params.tenantId, params.tournamentId, params.breakId, {
    label: params.draft.label,
    startAt,
    endAt,
    scope,
    tournamentPitchIds: scope === "SELECTED_PITCHES" ? params.draft.tournamentPitchIds : undefined,
  });
}

export async function deletePlanungOperationalBreak(params: {
  tenantId: string;
  tournamentId: string;
  breakId: string;
}): Promise<void> {
  await requireTenantOrganisedTournament(params.tenantId, params.tournamentId);
  await deleteTournamentBreak(params.tenantId, params.tournamentId, params.breakId);
}
