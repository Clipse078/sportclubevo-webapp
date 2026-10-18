/**
 * Maps product Home/Away toggle onto canonical round-robin meetings-per-opponent.
 */

export type PlanungFixtureHomeAwayRelevance = "ON" | "OFF";

/** Effective meetings for generation (Hin+Rück ⇒ at least 2 when Home/Away is ON and stored meetings is 1). */
export function resolveEffectiveRoundRobinMeetingsPerOpponent(
  storedMeetingsPerOpponent: number,
  fixtureHomeAwayRelevance: PlanungFixtureHomeAwayRelevance,
): number {
  const stored = Math.max(1, Math.floor(storedMeetingsPerOpponent));
  if (fixtureHomeAwayRelevance === "ON" && stored === 1) {
    return 2;
  }
  return stored;
}

/** Persisted meetings normalization when the Home/Away toggle changes. */
export function normalizeStoredRoundRobinMeetingsForHomeAwayToggle(
  storedMeetingsPerOpponent: number,
  previousRelevance: PlanungFixtureHomeAwayRelevance,
  nextRelevance: PlanungFixtureHomeAwayRelevance,
): number {
  const stored = Math.max(1, Math.floor(storedMeetingsPerOpponent));
  if (previousRelevance === "OFF" && nextRelevance === "ON" && stored === 1) {
    return 2;
  }
  if (previousRelevance === "ON" && nextRelevance === "OFF" && stored === 2) {
    return 1;
  }
  return stored;
}
