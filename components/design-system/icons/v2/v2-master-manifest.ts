/**
 * Canonical V2 migration manifest — one row per approved V1 master concept.
 */

import type { SceApprovedMasterIconName } from "../masters/approved-hero-meta";
import {
  buildV1MasterOpticalAudit,
  type V1MasterOpticalAuditRecord,
} from "./v1-master-optical-audit";

export type V2ArtworkStatus =
  | "AWAITING_PRODUCT_OWNER_ARTWORK"
  | "ARTWORK_SUPPLIED"
  | "INTEGRATED"
  | "PRODUCT_ADOPTED";

export type V2IntegrationStatus = "NOT_STARTED" | "GEOMETRY_LANDED" | "PRODUCT_PARTIAL" | "COMPLETE";

export type V2ProductAdoptionStatus = "V1_IN_PRODUCT" | "V2_PARTIAL" | "V2_COMPLETE";

export type SceV2MasterManifestRow = {
  name: SceApprovedMasterIconName;
  expectedSemantic: string;
  v1SourceFile: string;
  v1Fingerprint: string;
  v2ArtworkStatus: V2ArtworkStatus;
  opticalAuditStatus: V1MasterOpticalAuditRecord["recommendation"];
  replacementRequired: boolean;
  replacementFingerprint: string | null;
  currentColorCompliance: "V1_NON_COMPLIANT" | "V2_COMPLIANT";
  integrationStatus: V2IntegrationStatus;
  productAdoptionStatus: V2ProductAdoptionStatus;
  opticalPriority: V1MasterOpticalAuditRecord["priority"];
  legibility20Px: V1MasterOpticalAuditRecord["legibility20Px"];
  legibility24Px: V1MasterOpticalAuditRecord["legibility24Px"];
};

export function buildSceV2MasterManifest(): SceV2MasterManifestRow[] {
  return buildV1MasterOpticalAudit().map((audit) => ({
    name: audit.name,
    expectedSemantic: audit.semantic,
    v1SourceFile: audit.sourceFile,
    v1Fingerprint: audit.currentFingerprint,
    v2ArtworkStatus: "AWAITING_PRODUCT_OWNER_ARTWORK" as const,
    opticalAuditStatus: audit.recommendation,
    replacementRequired: true,
    replacementFingerprint: null,
    currentColorCompliance: "V1_NON_COMPLIANT" as const,
    integrationStatus: "NOT_STARTED" as const,
    productAdoptionStatus: "V1_IN_PRODUCT" as const,
    opticalPriority: audit.priority,
    legibility20Px: audit.legibility20Px,
    legibility24Px: audit.legibility24Px,
  }));
}

export function summarizeSceV2MasterManifest(rows = buildSceV2MasterManifest()) {
  return {
    concepts: rows.length,
    awaitingArtwork: rows.filter((r) => r.v2ArtworkStatus === "AWAITING_PRODUCT_OWNER_ARTWORK")
      .length,
    currentColorReady: rows.filter((r) => r.currentColorCompliance === "V2_COMPLIANT").length,
    replacementRequired: rows.filter((r) => r.replacementRequired).length,
  };
}
