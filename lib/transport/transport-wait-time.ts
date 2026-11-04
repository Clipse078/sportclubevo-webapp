/**
 * lib/transport/transport-wait-time.ts
 *
 * Semantic wait-time hierarchy for Infoboard transport departures.
 */

import {
  DEPARTURE_EXPIRY_GRACE_MS,
  DEPARTURE_IMMINENT_WINDOW_MS,
} from "./transport-effective-departure";

export const WAIT_TIME_SOON_MAX_MINUTES = 5;
export const WAIT_TIME_MEDIUM_MAX_MINUTES = 15;

export type WaitTimeTone = "soon" | "medium" | "long";

export type RelativeWaitDisplay =
  | { kind: "minutes"; minutesUntil: number }
  | { kind: "jetzt" }
  | { kind: "expired" };

/**
 * Maps effective departure time to a display state.
 * Negative offsets beyond {@link DEPARTURE_EXPIRY_GRACE_MS} are expired — not "Jetzt".
 */
export function resolveRelativeWaitDisplay(
  effectiveMs: number,
  nowMs: number,
): RelativeWaitDisplay {
  if (!Number.isFinite(effectiveMs) || !Number.isFinite(nowMs)) {
    return { kind: "expired" };
  }

  const remainingMs = effectiveMs - nowMs;

  if (remainingMs < -DEPARTURE_EXPIRY_GRACE_MS) {
    return { kind: "expired" };
  }

  if (remainingMs <= DEPARTURE_IMMINENT_WINDOW_MS) {
    return { kind: "jetzt" };
  }

  return {
    kind: "minutes",
    minutesUntil: Math.round(remainingMs / 60_000),
  };
}

/** @deprecated Prefer {@link resolveRelativeWaitDisplay} for expiry-aware UI. */
export function computeMinutesUntil(effectiveMs: number, nowMs: number): number {
  const display = resolveRelativeWaitDisplay(effectiveMs, nowMs);
  if (display.kind === "expired") {
    return -1;
  }
  if (display.kind === "jetzt") {
    return 0;
  }
  return display.minutesUntil;
}

/**
 * Map a relative wait in whole minutes to a semantic tone.
 *
 * 0–5 min  -> soon (green)
 * 6–15 min -> medium (amber)
 * 16+ min  -> long (neutral)
 */
export function resolveWaitTimeTone(minutesUntil: number): WaitTimeTone {
  if (minutesUntil <= WAIT_TIME_SOON_MAX_MINUTES) {
    return "soon";
  }

  if (minutesUntil <= WAIT_TIME_MEDIUM_MAX_MINUTES) {
    return "medium";
  }

  return "long";
}

export function formatRelativeWaitLabel(minutesUntil: number): string {
  return minutesUntil <= 0 ? "Jetzt" : `${minutesUntil} min`;
}

export function formatRelativeWaitDisplay(display: RelativeWaitDisplay): string | null {
  if (display.kind === "expired") {
    return null;
  }
  if (display.kind === "jetzt") {
    return "Jetzt";
  }
  return formatRelativeWaitLabel(display.minutesUntil);
}
