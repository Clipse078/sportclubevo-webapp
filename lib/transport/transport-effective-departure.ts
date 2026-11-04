/**
 * lib/transport/transport-effective-departure.ts
 *
 * Canonical effective departure resolution and expiry rules for Infoboard ÖV.
 *
 * Precedence:
 *   1. Valid provider predicted/realtime ISO timestamp when it already reflects delay.
 *   2. Planned departure plus validated delay in whole minutes (delay-only rows).
 *   3. Planned departure timetable time.
 *
 * Provider DTO fields are never mutated — resolution is derived at read time.
 */

import type { TransportDeparture } from "./transport-types";

/**
 * Small post-departure grace window before a row is treated as expired.
 * Covers clock-boundary flicker at the "Jetzt" moment — not a boarding window.
 */
export const DEPARTURE_EXPIRY_GRACE_MS = 30_000;

/** Whole-minute countdown switches to "Jetzt" inside this window before effective time. */
export const DEPARTURE_IMMINENT_WINDOW_MS = 60_000;

function parseIsoMs(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function plannedMs(departure: TransportDeparture): number | null {
  return parseIsoMs(departure.plannedDeparture);
}

function realtimeMs(departure: TransportDeparture): number | null {
  return parseIsoMs(departure.realtimeDeparture);
}

function validDelayMinutes(departure: TransportDeparture): number | null {
  if (
    typeof departure.delayMinutes !== "number" ||
    !Number.isFinite(departure.delayMinutes) ||
    departure.delayMinutes < 0
  ) {
    return null;
  }

  return Math.round(departure.delayMinutes);
}

function realtimeAlreadyReflectsDelay(departure: TransportDeparture): boolean {
  const planned = plannedMs(departure);
  const realtime = realtimeMs(departure);
  if (planned === null || realtime === null) {
    return false;
  }

  if (realtime !== planned) {
    return true;
  }

  const delay = validDelayMinutes(departure);
  return delay === null || delay === 0;
}

/**
 * Resolves the effective departure instant used for sorting, expiry, and countdowns.
 */
export function resolveEffectiveDepartureMs(departure: TransportDeparture): number {
  const planned = plannedMs(departure);
  const realtime = realtimeMs(departure);

  if (departure.realtimeDeparture && realtime !== null && realtimeAlreadyReflectsDelay(departure)) {
    return realtime;
  }

  if (planned !== null) {
    const delay = validDelayMinutes(departure);
    if (delay !== null && delay > 0) {
      return planned + delay * 60_000;
    }
    return planned;
  }

  if (realtime !== null) {
    return realtime;
  }

  return Number.POSITIVE_INFINITY;
}

/** ISO timestamp for presentation (effective instant, not a recomputed prognosis string). */
export function resolveEffectiveDepartureIso(departure: TransportDeparture): string {
  const effectiveMs = resolveEffectiveDepartureMs(departure);
  if (!Number.isFinite(effectiveMs)) {
    return departure.plannedDeparture;
  }

  return new Date(effectiveMs).toISOString();
}

export function compareEffectiveDepartures(
  left: TransportDeparture,
  right: TransportDeparture,
): number {
  const diff = resolveEffectiveDepartureMs(left) - resolveEffectiveDepartureMs(right);
  if (diff !== 0) {
    return diff;
  }

  const lineCompare = left.line.localeCompare(right.line);
  if (lineCompare !== 0) {
    return lineCompare;
  }

  return left.destination.localeCompare(right.destination);
}

export function isDepartureExpired(departure: TransportDeparture, nowMs: number): boolean {
  const effectiveMs = resolveEffectiveDepartureMs(departure);
  if (!Number.isFinite(effectiveMs)) {
    return true;
  }

  return nowMs > effectiveMs + DEPARTURE_EXPIRY_GRACE_MS;
}

export function isDepartureActive(departure: TransportDeparture, nowMs: number): boolean {
  return !isDepartureExpired(departure, nowMs);
}

export function filterActiveDepartures(
  departures: TransportDeparture[],
  nowMs: number,
): TransportDeparture[] {
  return departures.filter((departure) => isDepartureActive(departure, nowMs));
}
