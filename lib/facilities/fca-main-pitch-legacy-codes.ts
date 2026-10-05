/**
 * FACILITY-INTEGRITY-01A — single compatibility boundary for FCA main-pitch codes.
 *
 * Legacy HAUPTFELD* codes map to canonical STADION* persisted identities.
 * Used for reconciliation, historical Event.pitchCode display, and seed anchoring.
 */

import type { PitchAllocationCode } from "@/lib/facilities/pitches";

export const FCA_MAIN_PITCH_LEGACY_TO_CANONICAL: Readonly<
  Record<(typeof FCA_MAIN_PITCH_LEGACY_CODES)[number], PitchAllocationCode>
> = {
  HAUPTFELD: "STADION",
  "HAUPTFELD A": "STADION_A",
  "HAUPTFELD B": "STADION_B",
} as const;

export const FCA_MAIN_PITCH_LEGACY_CODES = [
  "HAUPTFELD",
  "HAUPTFELD A",
  "HAUPTFELD B",
] as const;

export const FCA_MAIN_PITCH_CANONICAL_CODES = [
  "STADION",
  "STADION_A",
  "STADION_B",
] as const;

export type FcaMainPitchLegacyCode = (typeof FCA_MAIN_PITCH_LEGACY_CODES)[number];
export type FcaMainPitchCanonicalCode = (typeof FCA_MAIN_PITCH_CANONICAL_CODES)[number];

export function isFcaMainPitchLegacyCode(code: string): code is FcaMainPitchLegacyCode {
  return (FCA_MAIN_PITCH_LEGACY_CODES as readonly string[]).includes(code);
}

export function isFcaMainPitchCanonicalCode(code: string): code is FcaMainPitchCanonicalCode {
  return (FCA_MAIN_PITCH_CANONICAL_CODES as readonly string[]).includes(code);
}

export function resolveFcaMainPitchCanonicalCode(
  code: string | null | undefined,
): PitchAllocationCode | null {
  if (!code) return null;
  if (isFcaMainPitchCanonicalCode(code)) return code;
  if (isFcaMainPitchLegacyCode(code)) {
    return FCA_MAIN_PITCH_LEGACY_TO_CANONICAL[code];
  }
  return null;
}
