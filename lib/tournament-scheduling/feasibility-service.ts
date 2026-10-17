/**
 * SCE-TOURNAMENT-PLANNER-01D — load/normalize tournament data and run pure feasibility engine.
 *
 * Physical FacilityResource availability is upstream (TournamentResourceAllocation).
 * The feasibility engine uses tournament-owned logical pitches + breaks only.
 */

import { prisma } from "@/lib/db/prisma";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import { SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES } from "@/lib/operational/defaults";
import { listTournamentFixtures } from "./fixture-service";
import { getTournamentScheduleVersion } from "./schedule-version-service";
import {
  analyseTournamentFeasibility,
  FEASIBILITY_DEFAULT_MIN_REST_MINUTES,
  FEASIBILITY_DEFAULT_TRANSITION_MINUTES,
  type FeasibilityInstantWindow,
  type FeasibilityTournamentBreakRef,
  type FeasibilityTournamentPitchRef,
  type TournamentFeasibilityInput,
  type TournamentFeasibilityResult,
} from "./feasibility";
import { requireTournamentEvent } from "./internal/require-tournament";
import { listTournamentBreaks } from "./tournament-break-service";
import { listTournamentPitches } from "./tournament-pitch-service";

export type ResolveTournamentSchedulingConfigInput = {
  matchDurationMinutes?: number | null;
  transitionMinutes?: number | null;
  minRestMinutes?: number | null;
};

export type ResolvedTournamentSchedulingConfig = {
  matchDurationMinutes: number;
  transitionMinutes: number;
  minRestMinutes: number;
  matchDurationSource: "SCHEDULE_VERSION" | "TENANT_DEFAULT" | "CALLER_OVERRIDE";
  transitionDurationSource: "SCHEDULE_VERSION" | "APPLICATION_DEFAULT" | "CALLER_OVERRIDE";
  minimumRestSource: "SCHEDULE_VERSION" | "APPLICATION_DEFAULT" | "CALLER_OVERRIDE";
};

/**
 * Authoritative scheduling configuration resolution (no competing truths).
 */
export async function resolveTournamentSchedulingConfig(
  tenantId: string,
  scheduleVersionId: string | null | undefined,
  overrides: ResolveTournamentSchedulingConfigInput = {},
): Promise<ResolvedTournamentSchedulingConfig> {
  let version: {
    matchDurationMinutes: number | null;
    transitionMinutes: number | null;
    minRestMinutes: number | null;
  } | null = null;

  if (scheduleVersionId) {
    const loaded = await getTournamentScheduleVersion(tenantId, scheduleVersionId);
    version = loaded;
  }

  const tenantPolicy = await getTenantOperationalDurationPolicy(tenantId);

  let matchDurationMinutes = tenantPolicy.TOURNAMENT.durationMinutes;
  let matchDurationSource: ResolvedTournamentSchedulingConfig["matchDurationSource"] =
    "TENANT_DEFAULT";

  if (version?.matchDurationMinutes != null) {
    matchDurationMinutes = version.matchDurationMinutes;
    matchDurationSource = "SCHEDULE_VERSION";
  }
  if (overrides.matchDurationMinutes != null) {
    matchDurationMinutes = overrides.matchDurationMinutes;
    matchDurationSource = "CALLER_OVERRIDE";
  }

  let transitionMinutes = FEASIBILITY_DEFAULT_TRANSITION_MINUTES;
  let transitionDurationSource: ResolvedTournamentSchedulingConfig["transitionDurationSource"] =
    "APPLICATION_DEFAULT";
  if (version?.transitionMinutes != null) {
    transitionMinutes = version.transitionMinutes;
    transitionDurationSource = "SCHEDULE_VERSION";
  }
  if (overrides.transitionMinutes != null) {
    transitionMinutes = overrides.transitionMinutes;
    transitionDurationSource = "CALLER_OVERRIDE";
  }

  let minRestMinutes = FEASIBILITY_DEFAULT_MIN_REST_MINUTES;
  let minimumRestSource: ResolvedTournamentSchedulingConfig["minimumRestSource"] =
    "APPLICATION_DEFAULT";
  if (version?.minRestMinutes != null) {
    minRestMinutes = version.minRestMinutes;
    minimumRestSource = "SCHEDULE_VERSION";
  }
  if (overrides.minRestMinutes != null) {
    minRestMinutes = overrides.minRestMinutes;
    minimumRestSource = "CALLER_OVERRIDE";
  }

  if (matchDurationMinutes <= 0) {
    matchDurationMinutes = SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES;
  }

  return {
    matchDurationMinutes,
    transitionMinutes,
    minRestMinutes,
    matchDurationSource,
    transitionDurationSource,
    minimumRestSource,
  };
}

function tournamentWindowFromEvent(startAt: Date, endAt: Date | null): FeasibilityInstantWindow {
  const startUtcMs = startAt.getTime();
  const endUtcMs = endAt?.getTime() ?? startUtcMs;
  return { startUtcMs, endUtcMs };
}

function mapBreaksForEngine(
  breaks: Awaited<ReturnType<typeof listTournamentBreaks>>,
): FeasibilityTournamentBreakRef[] {
  return breaks.map((br) => ({
    breakId: br.id,
    startUtcMs: new Date(br.startAt).getTime(),
    endUtcMs: new Date(br.endAt).getTime(),
    scope: br.scope === "ALL_PITCHES" ? "ALL_PITCHES" : "SELECTED_PITCHES",
    tournamentPitchIds:
      br.scope === "SELECTED_PITCHES" ? br.tournamentPitchIds : undefined,
  }));
}

function mapPitchesForEngine(
  pitches: Awaited<ReturnType<typeof listTournamentPitches>>,
): FeasibilityTournamentPitchRef[] {
  return pitches.map((p) => ({
    tournamentPitchId: p.id,
    displayOrder: p.displayOrder,
    label: p.label,
    playableIntervals: [],
  }));
}

export type TournamentScheduleEngineLoadResult = {
  tournamentWindow: FeasibilityInstantWindow;
  schedulingConfig: ResolvedTournamentSchedulingConfig;
  engineFixtures: TournamentFeasibilityInput["fixtures"];
  participants: TournamentFeasibilityInput["participants"];
  tournamentPitches: FeasibilityTournamentPitchRef[];
  breaks: FeasibilityTournamentBreakRef[];
};

async function loadTournamentScheduleEngineContext(
  tenantId: string,
  tournamentId: string,
  scheduleVersionId?: string | null,
  configOverrides: ResolveTournamentSchedulingConfigInput = {},
): Promise<TournamentScheduleEngineLoadResult> {
  await requireTournamentEvent(tenantId, tournamentId);
  const event = await prisma.event.findFirstOrThrow({
    where: { id: tournamentId, tenantId, type: "TOURNAMENT" },
    select: { startAt: true, endAt: true },
  });
  const tournamentWindow = tournamentWindowFromEvent(event.startAt, event.endAt);

  const [fixtures, participants, schedulingConfig, pitches, breaks] = await Promise.all([
    listTournamentFixtures(tenantId, tournamentId),
    prisma.tournamentParticipant.findMany({
      where: { tenantId, eventId: tournamentId },
      select: { id: true },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    }),
    resolveTournamentSchedulingConfig(tenantId, scheduleVersionId, configOverrides),
    listTournamentPitches(tenantId, tournamentId),
    listTournamentBreaks(tenantId, tournamentId),
  ]);

  const engineFixtures = fixtures
    .filter(
      (f): f is typeof f & { sideAParticipantId: string; sideBParticipantId: string } =>
        f.sideAParticipantId != null && f.sideBParticipantId != null,
    )
    .map((f) => ({
      fixtureId: f.id,
      stageKey: f.stageKey,
      tournamentGroupId: f.tournamentGroupId,
      roundIndex: f.roundIndex,
      slotIndexInRound: f.slotIndexInRound,
      sideAParticipantId: f.sideAParticipantId,
      sideBParticipantId: f.sideBParticipantId,
    }));

  return {
    tournamentWindow,
    schedulingConfig,
    engineFixtures,
    participants: participants.map((p) => ({ participantId: p.id })),
    tournamentPitches: mapPitchesForEngine(pitches),
    breaks: mapBreaksForEngine(breaks),
  };
}

export type AnalyseTournamentFeasibilityForTournamentInput = {
  tenantId: string;
  tournamentId: string;
  scheduleVersionId?: string | null;
  configOverrides?: ResolveTournamentSchedulingConfigInput;
  lockedAssignments?: TournamentFeasibilityInput["lockedAssignments"];
};

export type AnalyseTournamentFeasibilityForTournamentResult = {
  feasibility: TournamentFeasibilityResult;
  schedulingConfig: ResolvedTournamentSchedulingConfig;
  tournamentWindow: FeasibilityInstantWindow;
};

/**
 * Application boundary: loads tournament fixtures/pitches/breaks and invokes the pure engine.
 * Does not persist schedule versions or assignments.
 */
export async function loadTournamentScheduleOptimisationContext(
  tenantId: string,
  tournamentId: string,
  scheduleVersionId?: string | null,
  configOverrides: ResolveTournamentSchedulingConfigInput = {},
): Promise<TournamentScheduleEngineLoadResult> {
  return loadTournamentScheduleEngineContext(
    tenantId,
    tournamentId,
    scheduleVersionId,
    configOverrides,
  );
}

export async function analyseTournamentFeasibilityForTournament(
  input: AnalyseTournamentFeasibilityForTournamentInput,
): Promise<AnalyseTournamentFeasibilityForTournamentResult> {
  const loaded = await loadTournamentScheduleEngineContext(
    input.tenantId,
    input.tournamentId,
    input.scheduleVersionId,
    input.configOverrides,
  );

  const engineInput: TournamentFeasibilityInput = {
    tournamentWindow: loaded.tournamentWindow,
    config: {
      matchDurationMinutes: loaded.schedulingConfig.matchDurationMinutes,
      transitionMinutes: loaded.schedulingConfig.transitionMinutes,
      minRestMinutes: loaded.schedulingConfig.minRestMinutes,
    },
    fixtures: loaded.engineFixtures,
    participants: loaded.participants,
    tournamentPitches: loaded.tournamentPitches,
    breaks: loaded.breaks,
    lockedAssignments: input.lockedAssignments,
  };
  const schedulingConfig = loaded.schedulingConfig;
  const tournamentWindow = loaded.tournamentWindow;

  const feasibility = analyseTournamentFeasibility(engineInput);

  return {
    feasibility,
    schedulingConfig,
    tournamentWindow,
  };
}
