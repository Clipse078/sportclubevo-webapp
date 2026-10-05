/**
 * FACILITY-INTEGRITY-01A — pure planning/verification for FCA main-pitch consolidation.
 */

import {
  classifyHauptfeldHauptplatzPair,
  FCA_CANONICAL_MAIN_PITCH_CODES,
  FCA_LEGACY_MAIN_PITCH_CODES,
  type FacilityIntegrityFacilitySnapshot,
} from "@/lib/facilities/facility-integrity-diagnosis";
import {
  FCA_MAIN_PITCH_LEGACY_TO_CANONICAL,
  isFcaMainPitchLegacyCode,
} from "@/lib/facilities/fca-main-pitch-legacy-codes";

export const FCA_TENANT_KEY = "fc-allschwil";

export type MainPitchResourceRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  facilityId: string;
  facilityName: string;
};

export type ReferenceSource =
  | "TrainingAllocation"
  | "TrainingSessionAllocation"
  | "TournamentResourceAllocation"
  | "TournamentParticipantAllocation"
  | "EventFacilityAllocation"
  | "WeekplannerPlanAllocation"
  | "Event.pitchCode";

export type ReferenceMatrixRow = {
  source: ReferenceSource;
  referenceType: "facilityResourceId" | "pitchCode";
  legacyCount: number;
  targetCount: number;
  temporal: "CURRENT" | "HISTORICAL" | "CURRENT_AND_HISTORICAL";
  reconciliationAction: string;
};

export type MainPitchInventory = {
  tenantId: string;
  tenantKey: string;
  legacyFacility: { id: string; name: string };
  canonicalFacility: { id: string; name: string };
  legacyResources: MainPitchResourceRow[];
  canonicalResources: MainPitchResourceRow[];
  classification: ReturnType<typeof classifyHauptfeldHauptplatzPair>;
};

export type ConsolidationShapeError = {
  code: string;
  message: string;
};

export function buildReferenceMatrix(
  counts: Record<
    string,
    Partial<Record<ReferenceSource, number>>
  >,
): ReferenceMatrixRow[] {
  const sources: ReferenceSource[] = [
    "TrainingAllocation",
    "TrainingSessionAllocation",
    "TournamentResourceAllocation",
    "TournamentParticipantAllocation",
    "EventFacilityAllocation",
    "WeekplannerPlanAllocation",
    "Event.pitchCode",
  ];

  const rows: ReferenceMatrixRow[] = [];

  for (const source of sources) {
    let legacyCount = 0;
    let targetCount = 0;
    for (const code of FCA_LEGACY_MAIN_PITCH_CODES) {
      legacyCount += counts[code]?.[source] ?? 0;
    }
    for (const code of FCA_CANONICAL_MAIN_PITCH_CODES) {
      targetCount += counts[code]?.[source] ?? 0;
    }

    const referenceType = source === "Event.pitchCode" ? "pitchCode" : "facilityResourceId";
    let reconciliationAction = "No legacy references — no action";
    if (legacyCount > 0 && source === "Event.pitchCode") {
      reconciliationAction = "Migrate legacy pitchCode strings to canonical STADION* codes";
    } else if (legacyCount > 0) {
      reconciliationAction =
        "Re-point legacy facilityResourceId rows to canonical resource ids (merge duplicates on same parent)";
    } else if (targetCount > 0) {
      reconciliationAction = "Preserve canonical references unchanged";
    }

    rows.push({
      source,
      referenceType,
      legacyCount,
      targetCount,
      temporal: legacyCount > 0 && targetCount > 0 ? "CURRENT_AND_HISTORICAL" : "CURRENT",
      reconciliationAction,
    });
  }

  return rows;
}

export function inventoryFromFacilities(
  tenantId: string,
  tenantKey: string,
  facilities: readonly FacilityIntegrityFacilitySnapshot[],
): { inventory: MainPitchInventory | null; errors: ConsolidationShapeError[] } {
  const errors: ConsolidationShapeError[] = [];
  const active = facilities.filter((f) => f.status !== "ARCHIVED");

  const legacyResources: MainPitchResourceRow[] = [];
  const canonicalResources: MainPitchResourceRow[] = [];

  for (const facility of active) {
    for (const resource of facility.resources) {
      if (resource.status === "ARCHIVED") continue;
      const row: MainPitchResourceRow = {
        id: resource.id,
        code: resource.code,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        facilityId: facility.id,
        facilityName: facility.name,
      };
      if ((FCA_LEGACY_MAIN_PITCH_CODES as readonly string[]).includes(resource.code)) {
        legacyResources.push(row);
      }
      if ((FCA_CANONICAL_MAIN_PITCH_CODES as readonly string[]).includes(resource.code)) {
        canonicalResources.push(row);
      }
    }
  }

  const legacyFacilityIds = [...new Set(legacyResources.map((r) => r.facilityId))];
  const canonicalFacilityIds = [...new Set(canonicalResources.map((r) => r.facilityId))];

  const classification = classifyHauptfeldHauptplatzPair({
    legacyMainCodesPresent: legacyResources.map((r) => r.code),
    canonicalMainCodesPresent: canonicalResources.map((r) => r.code),
    legacyFacilityIds,
    canonicalFacilityIds,
  });

  if (classification !== "B_LEGACY_AND_CANONICAL") {
    if (classification === "E_INCONCLUSIVE" && legacyResources.length === 0 && canonicalResources.length > 0) {
      return { inventory: null, errors: [] };
    }
    errors.push({
      code: "UNEXPECTED_CLASSIFICATION",
      message: `Expected B_LEGACY_AND_CANONICAL for consolidation; got ${classification}`,
    });
    return { inventory: null, errors };
  }

  if (legacyFacilityIds.length !== 1) {
    errors.push({
      code: "LEGACY_FACILITY_COUNT",
      message: `Expected exactly one legacy facility; found ${legacyFacilityIds.length}`,
    });
  }
  if (canonicalFacilityIds.length !== 1) {
    errors.push({
      code: "CANONICAL_FACILITY_COUNT",
      message: `Expected exactly one canonical facility; found ${canonicalFacilityIds.length}`,
    });
  }

  const expectedLegacyCodes = new Set(FCA_LEGACY_MAIN_PITCH_CODES);
  const legacyCodesFound = new Set(legacyResources.map((r) => r.code));
  for (const code of expectedLegacyCodes) {
    if (!legacyCodesFound.has(code)) {
      errors.push({ code: "MISSING_LEGACY_CODE", message: `Missing active legacy code ${code}` });
    }
  }

  const expectedCanonicalCodes = new Set(FCA_CANONICAL_MAIN_PITCH_CODES);
  const canonicalCodesFound = new Set(canonicalResources.map((r) => r.code));
  for (const code of expectedCanonicalCodes) {
    if (!canonicalCodesFound.has(code)) {
      errors.push({ code: "MISSING_CANONICAL_CODE", message: `Missing active canonical code ${code}` });
    }
  }

  if (errors.length > 0) {
    return { inventory: null, errors };
  }

  const legacyFacility = active.find((f) => f.id === legacyFacilityIds[0])!;
  const canonicalFacility = active.find((f) => f.id === canonicalFacilityIds[0])!;

  return {
    inventory: {
      tenantId,
      tenantKey,
      legacyFacility: { id: legacyFacility.id, name: legacyFacility.name },
      canonicalFacility: { id: canonicalFacility.id, name: canonicalFacility.name },
      legacyResources,
      canonicalResources,
      classification,
    },
    errors: [],
  };
}

export function buildLegacyToCanonicalResourceIdMap(
  inventory: MainPitchInventory,
): Map<string, string> {
  const byCode = new Map(inventory.canonicalResources.map((r) => [r.code, r.id]));
  const map = new Map<string, string>();

  for (const legacy of inventory.legacyResources) {
    if (!isFcaMainPitchLegacyCode(legacy.code)) continue;
    const canonicalCode = FCA_MAIN_PITCH_LEGACY_TO_CANONICAL[legacy.code];
    const targetId = byCode.get(canonicalCode);
    if (!targetId) {
      throw new Error(`Missing canonical resource for code ${canonicalCode}`);
    }
    map.set(legacy.id, targetId);
  }

  return map;
}

export function countActiveMainPitchFacilities(
  facilities: readonly FacilityIntegrityFacilitySnapshot[],
): number {
  const activePitchFacilityIds = new Set<string>();
  for (const facility of facilities) {
    if (facility.status === "ARCHIVED" || facility.type !== "PITCH") continue;
    const hasMainPitch = facility.resources.some(
      (r) =>
        r.status !== "ARCHIVED" &&
        ((FCA_LEGACY_MAIN_PITCH_CODES as readonly string[]).includes(r.code) ||
          (FCA_CANONICAL_MAIN_PITCH_CODES as readonly string[]).includes(r.code)),
    );
    if (hasMainPitch) activePitchFacilityIds.add(facility.id);
  }
  return activePitchFacilityIds.size;
}
