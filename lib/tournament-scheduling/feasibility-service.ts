/**
 * SCE-TOURNAMENT-PLANNER-01D — load/normalize tournament data and run pure feasibility engine.
 */

import { prisma } from "@/lib/db/prisma";
import { getResourceAvailability } from "@/lib/facilities/availability-service";
import { classifyFacilityResourceType } from "@/lib/training/allocation-groups";
import { getTenantOperationalDurationPolicy } from "@/lib/operational/tenant-operational-duration-policy-service";
import { SCE_PLATFORM_DEFAULT_TOURNAMENT_DURATION_MINUTES } from "@/lib/operational/defaults";
import { listTournamentFixtures } from "./fixture-service";
import { getTournamentScheduleVersion } from "./schedule-version-service";
import {
  analyseTournamentFeasibility,
  FEASIBILITY_DEFAULT_MIN_REST_MINUTES,
  FEASIBILITY_DEFAULT_TRANSITION_MINUTES,
  type FeasibilityExternalOccupancyInterval,
  type FeasibilityInstantWindow,
  type FeasibilityResourceRef,
  type TournamentFeasibilityInput,
  type TournamentFeasibilityResult,
} from "./feasibility";
import { subtractOccupancyFromWindow } from "./feasibility/normalize-intervals";
import { requireTournamentEvent } from "./internal/require-tournament";
import { listTournamentResourceAllocations } from "@/lib/tournaments/resource-allocation-service";

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

async function loadPlayingResourcesWithAvailability(params: {
  tenantId: string;
  tournamentId: string;
  tournamentWindow: FeasibilityInstantWindow;
}): Promise<{
  resources: FeasibilityResourceRef[];
  externalOccupancy: FeasibilityExternalOccupancyInterval[];
}> {
  const allocations = await listTournamentResourceAllocations(params.tenantId, params.tournamentId);
  const playing = allocations.filter(
    (row) => classifyFacilityResourceType(row.facilityResourceType) === "PITCH_HALL",
  );

  const availability = await getResourceAvailability({
    tenantId: params.tenantId,
    startAt: new Date(params.tournamentWindow.startUtcMs),
    endAt: new Date(params.tournamentWindow.endUtcMs),
    group: "PITCH_HALL",
    excludeEventId: params.tournamentId,
  });

  const externalOccupancy: FeasibilityExternalOccupancyInterval[] = [];
  for (const row of availability) {
    for (const conflict of row.conflicts) {
      externalOccupancy.push({
        resourceId: row.resourceId,
        startUtcMs: new Date(conflict.startAt).getTime(),
        endUtcMs: new Date(conflict.endAt).getTime(),
      });
    }
  }

  const resources: FeasibilityResourceRef[] = playing.map((allocation) => {
    const baseWindow = params.tournamentWindow;
    const blocks = externalOccupancy.filter((b) => b.resourceId === allocation.facilityResourceId);
    const intervals = subtractOccupancyFromWindow(baseWindow, blocks);
    return {
      resourceId: allocation.facilityResourceId,
      availabilityIntervals: intervals,
    };
  });

  return { resources, externalOccupancy };
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
 * Application boundary: loads tournament fixtures/resources and invokes the pure engine.
 * Does not persist schedule versions or assignments.
 */
export async function analyseTournamentFeasibilityForTournament(
  input: AnalyseTournamentFeasibilityForTournamentInput,
): Promise<AnalyseTournamentFeasibilityForTournamentResult> {
  await requireTournamentEvent(input.tenantId, input.tournamentId);
  const event = await prisma.event.findFirstOrThrow({
    where: { id: input.tournamentId, tenantId: input.tenantId, type: "TOURNAMENT" },
    select: { startAt: true, endAt: true },
  });
  const tournamentWindow = tournamentWindowFromEvent(event.startAt, event.endAt);

  const [fixtures, participants, schedulingConfig, resourcePayload] = await Promise.all([
    listTournamentFixtures(input.tenantId, input.tournamentId),
    prisma.tournamentParticipant.findMany({
      where: { tenantId: input.tenantId, eventId: input.tournamentId },
      select: { id: true },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    }),
    resolveTournamentSchedulingConfig(
      input.tenantId,
      input.scheduleVersionId,
      input.configOverrides,
    ),
    loadPlayingResourcesWithAvailability({
      tenantId: input.tenantId,
      tournamentId: input.tournamentId,
      tournamentWindow,
    }),
  ]);

  const engineInput: TournamentFeasibilityInput = {
    tournamentWindow,
    config: {
      matchDurationMinutes: schedulingConfig.matchDurationMinutes,
      transitionMinutes: schedulingConfig.transitionMinutes,
      minRestMinutes: schedulingConfig.minRestMinutes,
    },
    fixtures: fixtures.map((f) => ({
      fixtureId: f.id,
      stageKey: f.stageKey,
      roundIndex: f.roundIndex,
      slotIndexInRound: f.slotIndexInRound,
      sideAParticipantId: f.sideAParticipantId,
      sideBParticipantId: f.sideBParticipantId,
    })),
    participants: participants.map((p) => ({ participantId: p.id })),
    resources: resourcePayload.resources,
    externalOccupancy: resourcePayload.externalOccupancy,
    lockedAssignments: input.lockedAssignments,
  };

  const feasibility = analyseTournamentFeasibility(engineInput);

  return {
    feasibility,
    schedulingConfig,
    tournamentWindow,
  };
}
