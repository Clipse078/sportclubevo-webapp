import { halfOpenIntervalsOverlap } from "./pitch-availability";
import type {
  FeasibilityDiagnostic,
  FeasibilityInstantWindow,
  FeasibilityTournamentBreakRef,
  FeasibilityTournamentPitchRef,
} from "./types";

/**
 * Breaks outside the tournament window are clipped to the window (documented normalization).
 */
export function clipBreakToWindow(
  breakInterval: FeasibilityInstantWindow,
  tournamentWindow: FeasibilityInstantWindow,
): FeasibilityInstantWindow | null {
  const startUtcMs = Math.max(breakInterval.startUtcMs, tournamentWindow.startUtcMs);
  const endUtcMs = Math.min(breakInterval.endUtcMs, tournamentWindow.endUtcMs);
  if (endUtcMs <= startUtcMs) return null;
  return { startUtcMs, endUtcMs };
}

export function validateTournamentBreaksInput(params: {
  breaks: readonly FeasibilityTournamentBreakRef[];
  pitches: readonly FeasibilityTournamentPitchRef[];
  tournamentWindow: FeasibilityInstantWindow;
}): FeasibilityDiagnostic[] {
  const diagnostics: FeasibilityDiagnostic[] = [];
  const pitchIds = new Set(params.pitches.map((p) => p.tournamentPitchId));

  for (const br of params.breaks) {
    if (br.endUtcMs <= br.startUtcMs) {
      diagnostics.push({
        code: "BREAK.INVALID",
        context: { breakId: br.breakId, reason: "START_NOT_BEFORE_END" },
      });
      continue;
    }

    const clipped = clipBreakToWindow(
      { startUtcMs: br.startUtcMs, endUtcMs: br.endUtcMs },
      params.tournamentWindow,
    );
    if (!clipped) {
      diagnostics.push({
        code: "BREAK.OUTSIDE_WINDOW",
        context: { breakId: br.breakId },
      });
    }

    if (br.scope === "SELECTED_PITCHES") {
      const selected = br.tournamentPitchIds ?? [];
      if (selected.length === 0) {
        diagnostics.push({
          code: "BREAK.INVALID",
          context: { breakId: br.breakId, reason: "EMPTY_SELECTED_PITCHES" },
        });
        continue;
      }
      const seen = new Set<string>();
      for (const pitchId of selected) {
        if (!pitchIds.has(pitchId)) {
          diagnostics.push({
            code: "BREAK.UNKNOWN_PITCH",
            context: { breakId: br.breakId, tournamentPitchId: pitchId },
          });
        }
        if (seen.has(pitchId)) {
          diagnostics.push({
            code: "BREAK.INVALID",
            context: { breakId: br.breakId, reason: "DUPLICATE_PITCH_REFERENCE" },
          });
        }
        seen.add(pitchId);
      }
    }
  }

  return diagnostics;
}

/**
 * Merge overlapping blocked intervals per pitch (deterministic union).
 */
function mergeBlockedIntervals(intervals: FeasibilityInstantWindow[]): FeasibilityInstantWindow[] {
  const sorted = [...intervals].sort((a, b) => a.startUtcMs - b.startUtcMs);
  const merged: FeasibilityInstantWindow[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last) {
      merged.push({ ...interval });
      continue;
    }
    if (interval.startUtcMs <= last.endUtcMs) {
      last.endUtcMs = Math.max(last.endUtcMs, interval.endUtcMs);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export function buildBlockedIntervalsByPitchId(params: {
  breaks: readonly FeasibilityTournamentBreakRef[];
  pitches: readonly FeasibilityTournamentPitchRef[];
  tournamentWindow: FeasibilityInstantWindow;
}): Map<string, FeasibilityInstantWindow[]> {
  const pitchIds = params.pitches.map((p) => p.tournamentPitchId);
  const byPitch = new Map<string, FeasibilityInstantWindow[]>();
  for (const id of pitchIds) {
    byPitch.set(id, []);
  }

  for (const br of params.breaks) {
    if (br.endUtcMs <= br.startUtcMs) continue;
    const clipped = clipBreakToWindow(
      { startUtcMs: br.startUtcMs, endUtcMs: br.endUtcMs },
      params.tournamentWindow,
    );
    if (!clipped) continue;

    const block = { startUtcMs: clipped.startUtcMs, endUtcMs: clipped.endUtcMs };
    if (br.scope === "ALL_PITCHES") {
      for (const id of pitchIds) {
        byPitch.get(id)!.push(block);
      }
    } else {
      for (const id of br.tournamentPitchIds ?? []) {
        if (byPitch.has(id)) {
          byPitch.get(id)!.push(block);
        }
      }
    }
  }

  for (const [id, intervals] of byPitch) {
    byPitch.set(id, mergeBlockedIntervals(intervals));
  }

  return byPitch;
}

export function slotOverlapsPitchBreak(
  slot: { tournamentPitchId: string; startUtcMs: number; resourceEndUtcMs: number },
  blockedIntervalsByPitchId: ReadonlyMap<string, readonly FeasibilityInstantWindow[]>,
): boolean {
  const blocks = blockedIntervalsByPitchId.get(slot.tournamentPitchId) ?? [];
  for (const block of blocks) {
    if (
      halfOpenIntervalsOverlap(
        slot.startUtcMs,
        slot.resourceEndUtcMs,
        block.startUtcMs,
        block.endUtcMs,
      )
    ) {
      return true;
    }
  }
  return false;
}
