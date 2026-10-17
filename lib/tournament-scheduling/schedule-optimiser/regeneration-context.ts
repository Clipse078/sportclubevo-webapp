import {
  applyFeasibilitySlot,
  createFeasibilitySearchState,
  type FeasibilitySearchState,
} from "../feasibility/complete-search";
import { canPlaceFixtureOnSlot } from "../feasibility/constraints";
import type { FeasibilityCandidateSlot, FeasibilityFixtureRef, FeasibilitySchedulingConfig } from "../feasibility/types";
import {
  fixtureAllowsSlot,
  isFixtureFullyLockedInState,
  mergeScheduleLocks,
  resolveFixtureScheduleLocksFromBaseline,
  toLockedAssignmentsForFeasibility,
  type ResolvedFixtureScheduleLock,
} from "../schedule-lock/normalize";
import type { TournamentScheduleOptimisationInput } from "./types";

function ms(minutes: number): number {
  return minutes * 60_000;
}

export type RegenerationSearchContext = {
  resolvedLocks: ResolvedFixtureScheduleLock[];
  lockByFixtureId: Map<string, ResolvedFixtureScheduleLock>;
  feasibilityLockedAssignments: ReturnType<typeof toLockedAssignmentsForFeasibility>;
  usesRegenerationObjective: boolean;
};

export function buildRegenerationSearchContext(
  input: TournamentScheduleOptimisationInput,
): RegenerationSearchContext {
  const merged = mergeScheduleLocks({
    scheduleLocks: input.scheduleLocks,
    lockedAssignments: input.lockedAssignments,
  });
  const baseline = input.baselineAssignments ?? [];
  const lockedRefs = input.lockedAssignments ?? [];
  const matchMs = input.config.matchDurationMinutes * 60_000;
  const transitionMs = ms(input.config.transitionMinutes ?? 0);

  const resolvedLocks =
    baseline.length > 0
      ? resolveFixtureScheduleLocksFromBaseline({
          locks: merged,
          baselineAssignments: baseline,
          matchDurationMinutes: input.config.matchDurationMinutes,
          transitionMinutes: input.config.transitionMinutes ?? 0,
        })
      : merged.map((lock) => {
          const ref = lockedRefs.find((r) => r.fixtureId === lock.fixtureId);
          const resolved: ResolvedFixtureScheduleLock = {
            fixtureId: lock.fixtureId,
            dimension: lock.dimension,
          };
          if (lock.dimension === "TIME_AND_PITCH" && ref) {
            resolved.tournamentPitchId = ref.tournamentPitchId;
            resolved.startUtcMs = ref.startUtcMs;
            resolved.participantEndUtcMs = ref.startUtcMs + matchMs;
            resolved.resourceEndUtcMs = ref.startUtcMs + matchMs + transitionMs;
          }
          return resolved;
        });

  const lockByFixtureId = new Map(resolvedLocks.map((l) => [l.fixtureId, l]));
  return {
    resolvedLocks,
    lockByFixtureId,
    feasibilityLockedAssignments: toLockedAssignmentsForFeasibility(resolvedLocks),
    usesRegenerationObjective: baseline.length > 0,
  };
}

export function buildInitialSearchStateFromRegeneration(params: {
  sortedFixtures: readonly FeasibilityFixtureRef[];
  candidateSlots: readonly FeasibilityCandidateSlot[];
  config: FeasibilitySchedulingConfig;
  windowStart: number;
  windowEnd: number;
  regeneration: RegenerationSearchContext;
  baselineAssignments: readonly {
    fixtureId: string;
    tournamentPitchId: string;
    startUtcMs: number;
    endUtcMs: number;
    resourceEndUtcMs: number;
  }[];
}): { ok: true; state: FeasibilitySearchState } | { ok: false } {
  const slotByKey = new Map<string, FeasibilityCandidateSlot>();
  for (const slot of params.candidateSlots) {
    slotByKey.set(`${slot.tournamentPitchId}\0${slot.startUtcMs}`, slot);
  }
  const fixtureById = new Map(params.sortedFixtures.map((f) => [f.fixtureId, f]));
  const baselineById = new Map(params.baselineAssignments.map((a) => [a.fixtureId, a]));
  const state = createFeasibilitySearchState();
  const matchMs = params.config.matchDurationMinutes * 60_000;

  const seedFixture = (fixtureId: string, pitchId: string, startUtcMs: number): boolean => {
    const fixture = fixtureById.get(fixtureId);
    if (!fixture) return false;
    const slot: FeasibilityCandidateSlot =
      slotByKey.get(`${pitchId}\0${startUtcMs}`) ?? {
        slotIndex: -1,
        tournamentPitchId: pitchId,
        startUtcMs,
        resourceEndUtcMs: startUtcMs + matchMs + ms(params.config.transitionMinutes ?? 0),
        participantEndUtcMs: startUtcMs + matchMs,
      };
    const participantIds = [fixture.sideAParticipantId, fixture.sideBParticipantId];
    const resourceBookings = state.resourceBookings.get(slot.tournamentPitchId) ?? [];
    if (
      !canPlaceFixtureOnSlot({
        fixtureId,
        participantIds,
        slot,
        config: params.config,
        windowStart: params.windowStart,
        windowEnd: params.windowEnd,
        resourceBookings,
        participantBookings: state.participantBookings,
        participantLastEnd: state.participantLastEnd,
      })
    ) {
      return false;
    }
    applyFeasibilitySlot(state, fixtureId, participantIds, slot);
    return true;
  };

  for (const lock of params.regeneration.resolvedLocks) {
    if (!isFixtureFullyLockedInState(lock)) continue;
    if (lock.tournamentPitchId === undefined || lock.startUtcMs === undefined) return { ok: false };
    if (!seedFixture(lock.fixtureId, lock.tournamentPitchId, lock.startUtcMs)) {
      return { ok: false };
    }
  }

  return { ok: true, state };
}

export function seedUnlockedBaselineIntoState(params: {
  state: FeasibilitySearchState;
  sortedFixtures: readonly FeasibilityFixtureRef[];
  candidateSlots: readonly FeasibilityCandidateSlot[];
  config: FeasibilitySchedulingConfig;
  windowStart: number;
  windowEnd: number;
  regeneration: RegenerationSearchContext;
  baselineAssignments: readonly {
    fixtureId: string;
    tournamentPitchId: string;
    startUtcMs: number;
  }[];
}): { ok: true } | { ok: false } {
  const slotByKey = new Map<string, FeasibilityCandidateSlot>();
  for (const slot of params.candidateSlots) {
    slotByKey.set(`${slot.tournamentPitchId}\0${slot.startUtcMs}`, slot);
  }
  const fixtureById = new Map(params.sortedFixtures.map((f) => [f.fixtureId, f]));
  const matchMs = params.config.matchDurationMinutes * 60_000;

  for (const baseline of params.baselineAssignments) {
    if (params.state.assignments.has(baseline.fixtureId)) continue;
    const lock = params.regeneration.lockByFixtureId.get(baseline.fixtureId);
    if (lock && isFixtureFullyLockedInState(lock)) continue;
    const fixture = fixtureById.get(baseline.fixtureId);
    if (!fixture) continue;
    const slot: FeasibilityCandidateSlot =
      slotByKey.get(`${baseline.tournamentPitchId}\0${baseline.startUtcMs}`) ?? {
        slotIndex: -1,
        tournamentPitchId: baseline.tournamentPitchId,
        startUtcMs: baseline.startUtcMs,
        resourceEndUtcMs: baseline.startUtcMs + matchMs + ms(params.config.transitionMinutes ?? 0),
        participantEndUtcMs: baseline.startUtcMs + matchMs,
      };
    const participantIds = [fixture.sideAParticipantId, fixture.sideBParticipantId];
    const resourceBookings = params.state.resourceBookings.get(slot.tournamentPitchId) ?? [];
    if (
      !canPlaceFixtureOnSlot({
        fixtureId: baseline.fixtureId,
        participantIds,
        slot,
        config: params.config,
        windowStart: params.windowStart,
        windowEnd: params.windowEnd,
        resourceBookings,
        participantBookings: params.state.participantBookings,
        participantLastEnd: params.state.participantLastEnd,
      })
    ) {
      return { ok: false };
    }
    applyFeasibilitySlot(params.state, baseline.fixtureId, participantIds, slot);
  }
  return { ok: true };
}

export function filterSlotsForFixtureLock(params: {
  slots: readonly FeasibilityCandidateSlot[];
  lock: ResolvedFixtureScheduleLock | undefined;
}): FeasibilityCandidateSlot[] {
  if (!params.lock || isFixtureFullyLockedInState(params.lock)) {
    return params.lock ? [] : [...params.slots];
  }
  return params.slots.filter((slot) =>
    fixtureAllowsSlot({
      lock: params.lock,
      slot: {
        tournamentPitchId: slot.tournamentPitchId,
        startUtcMs: slot.startUtcMs,
        participantEndUtcMs: slot.participantEndUtcMs,
      },
    }),
  );
}
