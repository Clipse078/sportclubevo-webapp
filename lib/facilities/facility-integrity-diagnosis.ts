/**
 * FACILITY-INTEGRITY-01 — tenant-scoped facility/resource integrity diagnosis.
 *
 * Pure, read-model helpers: no DB access. Used by admin UI and read-only scripts.
 */

import type { FacilityResourceType, FacilityStatus, FacilityType } from "@prisma/client";

export type FacilityIntegrityResourceSnapshot = {
  id: string;
  code: string;
  name: string;
  type: FacilityResourceType;
  status: FacilityStatus;
};

export type FacilityIntegrityFacilitySnapshot = {
  id: string;
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  resources: FacilityIntegrityResourceSnapshot[];
};

export type FacilityIntegrityFindingCode =
  | "LEGACY_CANONICAL_MAIN_PITCH_PAIR"
  | "DUPLICATE_ACTIVE_FULL_PITCH_CODES"
  | "ORPHAN_LEGACY_RESOURCE_ON_FACILITY";

export type FacilityIntegrityFinding = {
  code: FacilityIntegrityFindingCode;
  severity: "warning" | "info";
  title: string;
  detail: string;
  facilityIds: string[];
  resourceCodes: string[];
};

/** Legacy FCA main-pitch codes (pre-seed rename to STADION*). */
export const FCA_LEGACY_MAIN_PITCH_CODES = [
  "HAUPTFELD",
  "HAUPTFELD A",
  "HAUPTFELD B",
] as const;

/** Canonical seed target for the same physical Brüel main pitch. */
export const FCA_CANONICAL_MAIN_PITCH_CODES = [
  "STADION",
  "STADION_A",
  "STADION_B",
] as const;

function activeResources(
  facilities: readonly FacilityIntegrityFacilitySnapshot[],
): FacilityIntegrityResourceSnapshot[] {
  return facilities
    .filter((f) => f.status !== "ARCHIVED")
    .flatMap((f) => f.resources.filter((r) => r.status !== "ARCHIVED"));
}

function codesPresent(
  resources: readonly FacilityIntegrityResourceSnapshot[],
  codes: readonly string[],
): string[] {
  const set = new Set(resources.map((r) => r.code));
  return codes.filter((c) => set.has(c));
}

function facilityIdsForCodes(
  facilities: readonly FacilityIntegrityFacilitySnapshot[],
  codes: readonly string[],
): string[] {
  const codeSet = new Set(codes);
  const ids = new Set<string>();
  for (const facility of facilities) {
    if (facility.status === "ARCHIVED") continue;
    for (const resource of facility.resources) {
      if (resource.status === "ARCHIVED") continue;
      if (codeSet.has(resource.code)) ids.add(facility.id);
    }
  }
  return [...ids];
}

/**
 * Detects known integrity patterns from active facility/resource snapshots.
 * Does not infer duplicates from display names alone.
 */
export function diagnoseTenantFacilityIntegrity(
  facilities: readonly FacilityIntegrityFacilitySnapshot[],
): FacilityIntegrityFinding[] {
  const findings: FacilityIntegrityFinding[] = [];
  const resources = activeResources(facilities);

  const legacyMain = codesPresent(resources, FCA_LEGACY_MAIN_PITCH_CODES);
  const canonicalMain = codesPresent(resources, FCA_CANONICAL_MAIN_PITCH_CODES);

  if (legacyMain.length > 0 && canonicalMain.length > 0) {
    findings.push({
      code: "LEGACY_CANONICAL_MAIN_PITCH_PAIR",
      severity: "warning",
      title: "Hauptfeld und Hauptplatz parallel aktiv",
      detail:
        "Legacy HAUPTFELD*-Ressourcen und kanonische STADION*-Ressourcen existieren gleichzeitig. " +
        "Das erzeugt zwei Spielfeld-Gruppen im Wochenplaner für dieselbe physische Anlage. " +
        "Konsolidierung erfordert referenzsichere Migration (FACILITY-INTEGRITY-01A) — nicht blindes Löschen.",
      facilityIds: facilityIdsForCodes(facilities, [...legacyMain, ...canonicalMain]),
      resourceCodes: [...legacyMain, ...canonicalMain],
    });
  }

  const fullPitchByCode = new Map<string, string[]>();
  for (const resource of resources) {
    if (resource.type !== "FULL_PITCH") continue;
    const list = fullPitchByCode.get(resource.code) ?? [];
    list.push(resource.id);
    fullPitchByCode.set(resource.code, list);
  }
  for (const [code, ids] of fullPitchByCode) {
    if (ids.length <= 1) continue;
    findings.push({
      code: "DUPLICATE_ACTIVE_FULL_PITCH_CODES",
      severity: "warning",
      title: `Doppelte aktive FULL_PITCH-Ressource (${code})`,
      detail:
        "Mehr als eine aktive FULL_PITCH-Ressource teilt denselben Code. " +
        "Codes sind pro Mandant eindeutig — dieser Befund deutet auf veraltete Daten oder manuelle DB-Eingriffe hin.",
      facilityIds: facilityIdsForCodes(facilities, [code]),
      resourceCodes: [code],
    });
  }

  for (const facility of facilities) {
    if (facility.status === "ARCHIVED" || facility.type !== "PITCH") continue;
    const active = facility.resources.filter((r) => r.status !== "ARCHIVED");
    const legacyOnPitch = active.filter((r) =>
      (FCA_LEGACY_MAIN_PITCH_CODES as readonly string[]).includes(r.code),
    );
    const canonicalOnSame = active.filter((r) =>
      (FCA_CANONICAL_MAIN_PITCH_CODES as readonly string[]).includes(r.code),
    );
    if (legacyOnPitch.length > 0 && canonicalOnSame.length === 0 && legacyMain.length > 0 && canonicalMain.length > 0) {
      findings.push({
        code: "ORPHAN_LEGACY_RESOURCE_ON_FACILITY",
        severity: "info",
        title: `Legacy-Hauptfeld unter „${facility.name}"`,
        detail:
          "Diese Anlage enthält HAUPTFELD*-Ressourcen, während STADION* auf einer anderen Anlage liegt. " +
          "Typisches Muster nach Seed-Upsert per Anlagenname (Hauptfeld vs. Hauptplatz).",
        facilityIds: [facility.id],
        resourceCodes: legacyOnPitch.map((r) => r.code),
      });
    }
  }

  return findings;
}

export type HauptfeldHauptplatzClassification =
  | "A_TRUE_DUPLICATE"
  | "B_LEGACY_AND_CANONICAL"
  | "C_TWO_DISTINCT_PHYSICAL"
  | "D_READ_MODEL_ONLY"
  | "E_INCONCLUSIVE";

/**
 * Classifies Hauptfeld vs Hauptplatz from structured evidence (not display names).
 */
export function classifyHauptfeldHauptplatzPair(input: {
  legacyMainCodesPresent: readonly string[];
  canonicalMainCodesPresent: readonly string[];
  legacyFacilityIds: readonly string[];
  canonicalFacilityIds: readonly string[];
}): HauptfeldHauptplatzClassification {
  const hasLegacy = input.legacyMainCodesPresent.length > 0;
  const hasCanonical = input.canonicalMainCodesPresent.length > 0;

  if (hasLegacy && hasCanonical) {
    const distinctFacilities = new Set([
      ...input.legacyFacilityIds,
      ...input.canonicalFacilityIds,
    ]);
    if (distinctFacilities.size >= 2) {
      return "B_LEGACY_AND_CANONICAL";
    }
    return "A_TRUE_DUPLICATE";
  }

  if (hasLegacy !== hasCanonical) {
    return "E_INCONCLUSIVE";
  }

  return "C_TWO_DISTINCT_PHYSICAL";
}
