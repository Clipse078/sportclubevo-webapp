/**
 * Lock-aware manual move affordances for Planung board (01I).
 * Board rows = time (vertical), columns = TournamentPitch (horizontal).
 */

import type { TournamentFixtureScheduleLockDimension } from "@/lib/tournament-scheduling/types";

export function resolveManualMoveCapabilities(lockDimension: TournamentFixtureScheduleLockDimension | null): {
  canDrag: boolean;
  allowTimeChange: boolean;
  allowPitchChange: boolean;
  lockHint: string | null;
} {
  if (lockDimension === "TIME_AND_PITCH") {
    return {
      canDrag: false,
      allowTimeChange: false,
      allowPitchChange: false,
      lockHint: "Zeit und Feld sind gesperrt.",
    };
  }
  if (lockDimension === "TIME") {
    return {
      canDrag: true,
      allowTimeChange: false,
      allowPitchChange: true,
      lockHint: "Zeit gesperrt — nur Feldwechsel möglich.",
    };
  }
  if (lockDimension === "PITCH") {
    return {
      canDrag: true,
      allowTimeChange: true,
      allowPitchChange: false,
      lockHint: "Feld gesperrt — nur Zeitwechsel möglich.",
    };
  }
  return {
    canDrag: true,
    allowTimeChange: true,
    allowPitchChange: true,
    lockHint: null,
  };
}

export function manualMoveTargetAllowed(params: {
  lockDimension: TournamentFixtureScheduleLockDimension | null;
  fromPitchId: string;
  fromStartUtc: string;
  toPitchId: string;
  toStartUtc: string;
}): boolean {
  const caps = resolveManualMoveCapabilities(params.lockDimension);
  if (!caps.canDrag) return false;
  const timeChanged = params.fromStartUtc !== params.toStartUtc;
  const pitchChanged = params.fromPitchId !== params.toPitchId;
  if (timeChanged && !caps.allowTimeChange) return false;
  if (pitchChanged && !caps.allowPitchChange) return false;
  return timeChanged || pitchChanged;
}
