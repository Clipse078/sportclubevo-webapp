import type { ProjectionEvidenceStaleness } from "@/lib/finance/projection/projection-evidence-types";

export type PersistedProjectionEvidenceSnapshot = {
  evidenceFingerprint: string | null;
  actualsThroughDate: string;
};

export type CurrentProjectionEvidenceIdentity = {
  evidenceFingerprint: string;
  actualsThroughDate: string;
};

/**
 * Read-only staleness evaluation — does not mutate persisted projection versions.
 */
export function evaluateProjectionEvidenceStaleness(
  persisted: PersistedProjectionEvidenceSnapshot,
  current: CurrentProjectionEvidenceIdentity,
): ProjectionEvidenceStaleness {
  if (persisted.actualsThroughDate !== current.actualsThroughDate) {
    return "STALE";
  }
  if (!persisted.evidenceFingerprint) {
    return "STALE";
  }
  return persisted.evidenceFingerprint === current.evidenceFingerprint ? "FRESH" : "STALE";
}
