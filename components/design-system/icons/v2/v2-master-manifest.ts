/**
 * Canonical V2 migration manifest — one row per approved master concept.
 */

import type { SceApprovedMasterIconName } from "../masters/approved-hero-meta";
import { fingerprintApprovedHeroMasterSvg } from "../masters/approved-hero-fingerprint";
import { SCE_APPROVED_MASTER_ASSETS } from "../masters/approved-hero-meta";
import {
  buildV1MasterOpticalAudit,
  type V1MasterOpticalAuditRecord,
} from "./v1-master-optical-audit";
import {
  SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS,
  SCE_V2_AUTHORITATIVE_ARTWORK_SOURCE_SHA,
} from "./v2-authoritative-artwork-fingerprints";

export type V2ArtworkStatus =
  | "AWAITING_PRODUCT_OWNER_ARTWORK"
  | "ARTWORK_SUPPLIED"
  | "APPROVED"
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
  currentColorReady: boolean;
  currentColorCompliance: "V1_NON_COMPLIANT" | "V2_COMPLIANT";
  integrationStatus: V2IntegrationStatus;
  productAdoptionStatus: V2ProductAdoptionStatus;
  opticalPriority: V1MasterOpticalAuditRecord["priority"];
  legibility20Px: V1MasterOpticalAuditRecord["legibility20Px"];
  legibility24Px: V1MasterOpticalAuditRecord["legibility24Px"];
};

function isCurrentColorReady(name: SceApprovedMasterIconName): boolean {
  const raw = fingerprintApprovedHeroMasterSvg(SCE_APPROVED_MASTER_ASSETS[name]);
  return raw === SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS[name];
}

export function buildSceV2MasterManifest(): SceV2MasterManifestRow[] {
  return buildV1MasterOpticalAudit().map((audit) => {
    const replacementFingerprint = SCE_V2_AUTHORITATIVE_ARTWORK_FINGERPRINTS[audit.name];
    const artworkIntegrated =
      fingerprintApprovedHeroMasterSvg(SCE_APPROVED_MASTER_ASSETS[audit.name]) ===
      replacementFingerprint;

    return {
      name: audit.name,
      expectedSemantic: audit.semantic,
      v1SourceFile: audit.sourceFile,
      v1Fingerprint: audit.currentFingerprint,
      v2ArtworkStatus: artworkIntegrated ? "APPROVED" : "AWAITING_PRODUCT_OWNER_ARTWORK",
      opticalAuditStatus: audit.recommendation,
      replacementRequired: false,
      replacementFingerprint,
      currentColorReady: isCurrentColorReady(audit.name),
      currentColorCompliance: artworkIntegrated ? "V2_COMPLIANT" : "V1_NON_COMPLIANT",
      integrationStatus: artworkIntegrated ? "GEOMETRY_LANDED" : "NOT_STARTED",
      productAdoptionStatus: artworkIntegrated ? "V2_PARTIAL" : "V1_IN_PRODUCT",
      opticalPriority: audit.priority,
      legibility20Px: audit.legibility20Px,
      legibility24Px: audit.legibility24Px,
    };
  });
}

export function summarizeSceV2MasterManifest(rows = buildSceV2MasterManifest()) {
  return {
    concepts: rows.length,
    approved: rows.filter((r) => r.v2ArtworkStatus === "APPROVED").length,
    awaitingArtwork: rows.filter((r) => r.v2ArtworkStatus === "AWAITING_PRODUCT_OWNER_ARTWORK")
      .length,
    currentColorReady: rows.filter((r) => r.currentColorReady).length,
    integrated: rows.filter((r) => r.integrationStatus !== "NOT_STARTED").length,
    productAdopted: rows.filter((r) => r.productAdoptionStatus === "V2_COMPLETE").length,
    replacementRequired: rows.filter((r) => r.replacementRequired).length,
    artworkSourceSha: SCE_V2_AUTHORITATIVE_ARTWORK_SOURCE_SHA,
  };
}
