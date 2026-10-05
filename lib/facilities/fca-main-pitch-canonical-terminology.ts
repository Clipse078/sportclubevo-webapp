/**
 * FACILITY-INTEGRITY-01A-R2 — canonical human-facing names for FCA main pitch.
 *
 * Technical resource codes (STADION, STADION_A, STADION_B) are unchanged.
 */

import type { FcaMainPitchCanonicalCode } from "@/lib/facilities/fca-main-pitch-legacy-codes";
import { FCA_MAIN_PITCH_CANONICAL_CODES } from "@/lib/facilities/fca-main-pitch-legacy-codes";

/** Canonical FCA physical main-pitch facility name. */
export const FCA_MAIN_PITCH_FACILITY_NAME = "Hauptfeld";

/** Canonical FacilityResource.name per STADION* code (tenant fc-allschwil). */
export const FCA_MAIN_PITCH_RESOURCE_NAMES: Readonly<
  Record<FcaMainPitchCanonicalCode, string>
> = {
  STADION: "Hauptfeld",
  STADION_A: "Hauptfeld A",
  STADION_B: "Hauptfeld B",
};

/** R1-era persisted names replaced by R2 reconciliation (idempotent). */
export const FCA_MAIN_PITCH_R1_FACILITY_NAMES = ["Hauptplatz"] as const;

export const FCA_MAIN_PITCH_R1_RESOURCE_NAMES: Readonly<
  Record<FcaMainPitchCanonicalCode, readonly string[]>
> = {
  STADION: ["Hauptplatz"],
  STADION_A: ["Hauptplatz A", "A"],
  STADION_B: ["Hauptplatz B", "B"],
};

export function isFcaMainPitchCanonicalResourceName(
  code: string,
  name: string,
): boolean {
  if (!(FCA_MAIN_PITCH_CANONICAL_CODES as readonly string[]).includes(code)) {
    return false;
  }
  const canonical = FCA_MAIN_PITCH_RESOURCE_NAMES[code as FcaMainPitchCanonicalCode];
  return name.trim() === canonical;
}

export function shouldRenameFcaMainPitchFacility(facilityName: string): boolean {
  const trimmed = facilityName.trim();
  if (trimmed === FCA_MAIN_PITCH_FACILITY_NAME) return false;
  return (FCA_MAIN_PITCH_R1_FACILITY_NAMES as readonly string[]).includes(
    trimmed as (typeof FCA_MAIN_PITCH_R1_FACILITY_NAMES)[number],
  );
}

export function shouldRenameFcaMainPitchResource(
  code: string,
  resourceName: string,
): boolean {
  if (!(FCA_MAIN_PITCH_CANONICAL_CODES as readonly string[]).includes(code)) {
    return false;
  }
  const canonicalCode = code as FcaMainPitchCanonicalCode;
  if (isFcaMainPitchCanonicalResourceName(code, resourceName)) return false;
  const legacyNames = FCA_MAIN_PITCH_R1_RESOURCE_NAMES[canonicalCode];
  const trimmed = resourceName.trim();
  return legacyNames.some((legacy) => legacy === trimmed);
}
