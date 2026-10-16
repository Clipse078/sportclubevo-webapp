/**
 * 01A hard constraint catalogue — executable validation contracts (01D).
 *
 * RESOURCE_SLOT_DURATION = matchDuration + transitionDuration (H2, H9)
 * PARTICIPANT_ACTIVE_DURATION = matchDuration only (H3, H4)
 * REST: nextStart >= previousParticipantEnd + minRestMinutes (H4)
 */

import type { FeasibilityAssignmentRef, FeasibilityCandidateSlot, FeasibilitySchedulingConfig } from "./types";

export const HARD_CONSTRAINT_CATALOGUE = [
  {
    id: "H1",
    name: "Each fixture scheduled at most once",
    inputs: ["fixtures", "assignmentMap"],
    validationRule: "Every fixture id appears at most once in assignments",
    diagnosticCode: "FIXTURE_SET.INVALID",
  },
  {
    id: "H2",
    name: "No pitch overlap",
    inputs: ["resourceId", "resourceOccupancyInterval"],
    validationRule: "Disjoint resource occupancy intervals per pitch",
    diagnosticCode: "CAPACITY.INSUFFICIENT_PARALLEL_PITCHES",
  },
  {
    id: "H3",
    name: "No participant overlap",
    inputs: ["participantId", "participantActiveInterval"],
    validationRule: "Disjoint participant active intervals per participant",
    diagnosticCode: "ASSIGNMENT.SEARCH_EXHAUSTED",
  },
  {
    id: "H4",
    name: "Minimum rest between matches",
    inputs: ["minRestMinutes", "participantActiveEnd", "nextStart"],
    validationRule: "nextStart >= previousEnd + minRestMinutes",
    diagnosticCode: "REST.CANNOT_SATISFY_MIN_REST",
  },
  {
    id: "H5",
    name: "Inside tournament operating window",
    inputs: ["tournamentWindow", "slotStart", "resourceEnd"],
    validationRule: "slot within [window.start, window.end]",
    diagnosticCode: "CAPACITY.WINDOW_TOO_SHORT",
  },
  {
    id: "H6",
    name: "Eligible pitches only",
    inputs: ["resources[]"],
    validationRule: "Assignments reference supplied playable resources",
    diagnosticCode: "RESOURCE.UNAVAILABLE",
  },
  {
    id: "H7",
    name: "Locked assignments immutable",
    inputs: ["lockedAssignments"],
    validationRule: "Locked fixture uses fixed pitch + start",
    diagnosticCode: "LOCKS.CONFLICTING",
  },
  {
    id: "H8",
    name: "Fixture pairing intact",
    inputs: ["fixture sides"],
    validationRule: "Scheduler assigns existing fixture ids only",
    diagnosticCode: "FIXTURE_SET.INVALID",
  },
  {
    id: "H9",
    name: "Match duration fits slot",
    inputs: ["matchDuration", "transitionDuration"],
    validationRule: "Resource slot = match + transition",
    diagnosticCode: "CAPACITY.WINDOW_TOO_SHORT",
  },
  {
    id: "H10",
    name: "No SCE allocation conflicts",
    inputs: ["externalOccupancy"],
    validationRule: "Slots avoid injected occupancy intervals",
    diagnosticCode: "RESOURCE.UNAVAILABLE",
  },
  {
    id: "H11",
    name: "Timezone / civil time",
    inputs: ["normalized instants at boundary"],
    validationRule: "Engine uses UTC ms; conversion at application layer",
    diagnosticCode: "CAPACITY.WINDOW_TOO_SHORT",
  },
  {
    id: "H12",
    name: "No silent fixture drop",
    inputs: ["fixtureCount", "assignmentCount"],
    validationRule: "All fixtures scheduled or status INFEASIBLE",
    diagnosticCode: "ASSIGNMENT.SEARCH_EXHAUSTED",
  },
] as const;

type ResourceBooking = {
  fixtureId: string;
  startUtcMs: number;
  resourceEndUtcMs: number;
};

type ParticipantBooking = {
  fixtureId: string;
  startUtcMs: number;
  participantEndUtcMs: number;
};

export function slotWithinTournamentWindow(
  windowStart: number,
  windowEnd: number,
  slot: Pick<FeasibilityCandidateSlot, "startUtcMs" | "resourceEndUtcMs">,
): boolean {
  return slot.startUtcMs >= windowStart && slot.resourceEndUtcMs <= windowEnd;
}

export function satisfiesParticipantRest(
  config: FeasibilitySchedulingConfig,
  previousParticipantEndUtcMs: number | undefined,
  slotStartUtcMs: number,
): boolean {
  if (previousParticipantEndUtcMs === undefined) return true;
  const minGapMs = config.minRestMinutes * 60_000;
  return slotStartUtcMs >= previousParticipantEndUtcMs + minGapMs;
}

export function participantIntervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function resourceIntervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function canPlaceFixtureOnSlot(params: {
  fixtureId: string;
  participantIds: readonly string[];
  slot: FeasibilityCandidateSlot;
  config: FeasibilitySchedulingConfig;
  windowStart: number;
  windowEnd: number;
  resourceBookings: readonly ResourceBooking[];
  participantBookings: Map<string, ParticipantBooking[]>;
  participantLastEnd: Map<string, number>;
}): boolean {
  if (!slotWithinTournamentWindow(params.windowStart, params.windowEnd, params.slot)) {
    return false;
  }

  for (const booking of params.resourceBookings) {
    if (booking.fixtureId === params.fixtureId) continue;
    if (booking.startUtcMs === params.slot.startUtcMs) {
      // same start different fixture — still check overlap on resource
    }
    if (
      params.slot.resourceId &&
      resourceIntervalsOverlap(
        params.slot.startUtcMs,
        params.slot.resourceEndUtcMs,
        booking.startUtcMs,
        booking.resourceEndUtcMs,
      )
    ) {
      // resourceBookings are per-resource in caller
      return false;
    }
  }

  for (const participantId of params.participantIds) {
    const lastEnd = params.participantLastEnd.get(participantId);
    if (!satisfiesParticipantRest(params.config, lastEnd, params.slot.startUtcMs)) {
      return false;
    }

    const bookings = params.participantBookings.get(participantId) ?? [];
    for (const booking of bookings) {
      if (booking.fixtureId === params.fixtureId) continue;
      if (
        participantIntervalsOverlap(
          params.slot.startUtcMs,
          params.slot.participantEndUtcMs,
          booking.startUtcMs,
          booking.participantEndUtcMs,
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

export function assignmentFromSlot(
  fixtureId: string,
  slot: FeasibilityCandidateSlot,
): FeasibilityAssignmentRef {
  return {
    fixtureId,
    resourceId: slot.resourceId,
    startUtcMs: slot.startUtcMs,
  };
}
