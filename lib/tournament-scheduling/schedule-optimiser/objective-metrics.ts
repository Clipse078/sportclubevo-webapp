import type { FeasibilitySearchState } from "../feasibility/complete-search";
import type { FeasibilitySchedulingConfig } from "../feasibility/types";
import { isStructuralSchedulingParticipantId } from "../smart-timing/prepare-context";
import {
  SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER,
  type ScheduleSoftObjectiveId,
} from "../smart-timing/soft-objectives";
import type { ScheduleObjectiveMetrics } from "./types";

function variance(values: readonly number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
}

function participantRestGapsMinutes(
  state: FeasibilitySearchState,
  config: FeasibilitySchedulingConfig,
): Map<string, number[]> {
  const gaps = new Map<string, number[]>();
  for (const [participantId, bookings] of state.participantBookings) {
    if (isStructuralSchedulingParticipantId(participantId)) continue;
    const sorted = [...bookings].sort((a, b) => a.startUtcMs - b.startUtcMs);
    const restMinutes: number[] = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const gapMs = sorted[i].startUtcMs - sorted[i - 1].participantEndUtcMs;
      restMinutes.push(Math.floor(gapMs / 60_000));
    }
    if (restMinutes.length > 0) gaps.set(participantId, restMinutes);
  }
  return gaps;
}

export function computeScheduleObjectiveMetrics(params: {
  state: FeasibilitySearchState;
  config: FeasibilitySchedulingConfig;
  windowStartUtcMs: number;
  pitchIds: readonly string[];
}): ScheduleObjectiveMetrics {
  const restByParticipant = participantRestGapsMinutes(params.state, params.config);
  const allRests: number[] = [];
  for (const rests of restByParticipant.values()) {
    allRests.push(...rests);
  }

  const minObservedRest =
    allRests.length === 0 ? params.config.minRestMinutes : Math.min(...allRests);
  const restFairnessPenalty =
    allRests.length === 0
      ? 0
      : variance(allRests) + Math.max(0, params.config.minRestMinutes - minObservedRest) * 10_000;

  let idleGapPenalty = 0;
  for (const rests of restByParticipant.values()) {
    for (const rest of rests) {
      const excess = Math.max(0, rest - params.config.minRestMinutes);
      idleGapPenalty += excess * excess;
    }
  }

  const pitchUsage = new Map<string, number>();
  for (const pitchId of params.pitchIds) pitchUsage.set(pitchId, 0);
  for (const slot of params.state.assignments.values()) {
    pitchUsage.set(slot.tournamentPitchId, (pitchUsage.get(slot.tournamentPitchId) ?? 0) + 1);
  }
  const usageCounts = [...pitchUsage.values()];
  const pitchDistributionPenalty = variance(usageCounts);

  let pitchSwitchPenalty = 0;
  for (const [participantId, bookings] of params.state.participantBookings) {
    if (isStructuralSchedulingParticipantId(participantId)) continue;
    const sorted = [...bookings].sort((a, b) => a.startUtcMs - b.startUtcMs);
    for (let i = 1; i < sorted.length; i += 1) {
      const prevPitch = params.state.assignments.get(sorted[i - 1]!.fixtureId)?.tournamentPitchId;
      const nextPitch = params.state.assignments.get(sorted[i]!.fixtureId)?.tournamentPitchId;
      if (prevPitch && nextPitch && prevPitch !== nextPitch) pitchSwitchPenalty += 1;
    }
  }

  const firstLastPenalty = computeFirstLastSlotFairnessPenalty(params.state);

  let minStart: number | null = null;
  let maxResourceEnd: number | null = null;
  for (const slot of params.state.assignments.values()) {
    if (minStart === null || slot.startUtcMs < minStart) minStart = slot.startUtcMs;
    if (maxResourceEnd === null || slot.resourceEndUtcMs > maxResourceEnd) {
      maxResourceEnd = slot.resourceEndUtcMs;
    }
  }
  const tournamentSpanMinutes =
    minStart === null || maxResourceEnd === null
      ? 0
      : Math.ceil((maxResourceEnd - params.windowStartUtcMs) / 60_000);

  const metrics: ScheduleObjectiveMetrics = {
    tournamentSpanMinutes,
    IMPROVE_PARTICIPANT_REST_FAIRNESS: restFairnessPenalty,
    REDUCE_EXTREME_IDLE_GAPS: idleGapPenalty,
    DISTRIBUTE_PITCH_USAGE: pitchDistributionPenalty,
    REDUCE_UNNECESSARY_PITCH_SWITCHES: pitchSwitchPenalty,
    DISTRIBUTE_FIRST_AND_LAST_SLOTS_FAIRLY: firstLastPenalty,
    MINIMIZE_TOURNAMENT_SPAN: tournamentSpanMinutes,
  };
  return metrics;
}

function computeFirstLastSlotFairnessPenalty(state: FeasibilitySearchState): number {
  if (state.assignments.size === 0) return 0;
  const ordered = [...state.assignments.entries()].sort(
    (a, b) => a[1].startUtcMs - b[1].startUtcMs || a[0].localeCompare(b[0]),
  );
  const firstIdx = 0;
  const lastIdx = ordered.length - 1;
  const firstFixtureId = ordered[firstIdx]![0];
  const lastFixtureId = ordered[lastIdx]![0];

  const firstCounts = new Map<string, number>();
  const lastCounts = new Map<string, number>();

  for (const [participantId, bookings] of state.participantBookings) {
    if (isStructuralSchedulingParticipantId(participantId)) continue;
    for (const booking of bookings) {
      if (booking.fixtureId === firstFixtureId) {
        firstCounts.set(participantId, (firstCounts.get(participantId) ?? 0) + 1);
      }
      if (booking.fixtureId === lastFixtureId) {
        lastCounts.set(participantId, (lastCounts.get(participantId) ?? 0) + 1);
      }
    }
  }

  return variance([...firstCounts.values()]) + variance([...lastCounts.values()]);
}

export function compareScheduleObjectiveMetrics(a: ScheduleObjectiveMetrics, b: ScheduleObjectiveMetrics): number {
  for (const key of SCHEDULE_SOFT_OBJECTIVES_LEX_ORDER) {
    if (key === "SATISFY_ALL_HARD_CONSTRAINTS") continue;
    const av = a[key as ScheduleSoftObjectiveId] ?? 0;
    const bv = b[key as ScheduleSoftObjectiveId] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

export function cloneSearchState(state: FeasibilitySearchState): FeasibilitySearchState {
  return {
    assignments: new Map(state.assignments),
    resourceBookings: new Map(
      [...state.resourceBookings.entries()].map(([k, v]) => [k, [...v]] as const),
    ),
    participantBookings: new Map(
      [...state.participantBookings.entries()].map(([k, v]) => [k, [...v]] as const),
    ),
    participantLastEnd: new Map(state.participantLastEnd),
  };
}
