import type { FeasibilityAssignmentRef } from "../feasibility/types";
import type { TournamentFixtureScheduleAssignment } from "../schedule-optimiser/types";
import type { TournamentFixtureScheduleLock, TournamentFixtureScheduleLockDimension } from "./types";

/**
 * Canonical persisted lock resolution (01G-R1):
 * - `scheduleLockDimension` wins when set.
 * - Legacy `isLocked=true` with null dimension → TIME_AND_PITCH (pre-migration rows).
 * - `isLocked=true` with TIME or PITCH dimension → dimension wins; isLocked stays false for partial locks in DB writes.
 */
export function resolveEffectiveScheduleLockDimension(input: {
  scheduleLockDimension: TournamentFixtureScheduleLockDimension | null;
  isLocked: boolean;
}): TournamentFixtureScheduleLockDimension | null {
  if (input.scheduleLockDimension != null) {
    return input.scheduleLockDimension;
  }
  if (input.isLocked) {
    return "TIME_AND_PITCH";
  }
  return null;
}

export function scheduleLockFromPersistedAssignment(input: {
  fixtureId: string;
  scheduleLockDimension: TournamentFixtureScheduleLockDimension | null;
  isLocked: boolean;
}): TournamentFixtureScheduleLock | null {
  const dimension = resolveEffectiveScheduleLockDimension(input);
  if (!dimension) return null;
  return { fixtureId: input.fixtureId, dimension };
}

export type ResolvedFixtureScheduleLock = {
  fixtureId: string;
  dimension: TournamentFixtureScheduleLockDimension;
  startUtcMs?: number;
  participantEndUtcMs?: number;
  resourceEndUtcMs?: number;
  tournamentPitchId?: string;
};

function ms(minutes: number): number {
  return minutes * 60_000;
}

export function mergeScheduleLocks(params: {
  scheduleLocks?: readonly TournamentFixtureScheduleLock[];
  lockedAssignments?: readonly FeasibilityAssignmentRef[];
}): TournamentFixtureScheduleLock[] {
  const byFixture = new Map<string, TournamentFixtureScheduleLockDimension>();
  for (const lock of params.scheduleLocks ?? []) {
    byFixture.set(lock.fixtureId, lock.dimension);
  }
  for (const full of params.lockedAssignments ?? []) {
    if (!byFixture.has(full.fixtureId)) {
      byFixture.set(full.fixtureId, "TIME_AND_PITCH");
    }
  }
  return [...byFixture.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([fixtureId, dimension]) => ({ fixtureId, dimension }));
}

export function resolveFixtureScheduleLocksFromBaseline(params: {
  locks: readonly TournamentFixtureScheduleLock[];
  baselineAssignments: readonly TournamentFixtureScheduleAssignment[];
  matchDurationMinutes: number;
  transitionMinutes: number;
}): ResolvedFixtureScheduleLock[] {
  const baselineById = new Map(params.baselineAssignments.map((a) => [a.fixtureId, a]));
  const matchMs = params.matchDurationMinutes * 60_000;
  const transitionMs = ms(params.transitionMinutes);

  return params.locks.map((lock) => {
    const baseline = baselineById.get(lock.fixtureId);
    const resolved: ResolvedFixtureScheduleLock = {
      fixtureId: lock.fixtureId,
      dimension: lock.dimension,
    };
    if (!baseline) {
      return resolved;
    }
    if (lock.dimension === "TIME" || lock.dimension === "TIME_AND_PITCH") {
      resolved.startUtcMs = baseline.startUtcMs;
      resolved.participantEndUtcMs = baseline.endUtcMs;
      resolved.resourceEndUtcMs = baseline.resourceEndUtcMs;
    }
    if (lock.dimension === "PITCH" || lock.dimension === "TIME_AND_PITCH") {
      resolved.tournamentPitchId = baseline.tournamentPitchId;
    }
    if (lock.dimension === "TIME" && resolved.resourceEndUtcMs === undefined) {
      resolved.resourceEndUtcMs = baseline.startUtcMs + matchMs + transitionMs;
    }
    return resolved;
  });
}

export function toLockedAssignmentsForFeasibility(
  resolved: readonly ResolvedFixtureScheduleLock[],
): FeasibilityAssignmentRef[] {
  return resolved
    .filter((r) => r.dimension === "TIME_AND_PITCH")
    .filter(
      (r): r is ResolvedFixtureScheduleLock & { tournamentPitchId: string; startUtcMs: number } =>
        r.tournamentPitchId !== undefined && r.startUtcMs !== undefined,
    )
    .map((r) => ({
      fixtureId: r.fixtureId,
      tournamentPitchId: r.tournamentPitchId,
      startUtcMs: r.startUtcMs,
    }));
}

export function fixtureAllowsSlot(params: {
  lock: ResolvedFixtureScheduleLock | undefined;
  slot: { tournamentPitchId: string; startUtcMs: number; participantEndUtcMs: number };
}): boolean {
  const { lock, slot } = params;
  if (!lock) return true;
  if (lock.dimension === "TIME_AND_PITCH") {
    return (
      lock.tournamentPitchId === slot.tournamentPitchId &&
      lock.startUtcMs === slot.startUtcMs &&
      lock.participantEndUtcMs === slot.participantEndUtcMs
    );
  }
  if (lock.dimension === "TIME") {
    return lock.startUtcMs === slot.startUtcMs && lock.participantEndUtcMs === slot.participantEndUtcMs;
  }
  if (lock.dimension === "PITCH") {
    return lock.tournamentPitchId === slot.tournamentPitchId;
  }
  return true;
}

export function isFixtureFullyLockedInState(
  lock: ResolvedFixtureScheduleLock | undefined,
): boolean {
  return lock?.dimension === "TIME_AND_PITCH";
}

export function canRelocateFixtureDuringImprovement(
  lock: ResolvedFixtureScheduleLock | undefined,
): boolean {
  return lock === undefined;
}
