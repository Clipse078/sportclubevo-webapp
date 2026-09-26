/**
 * SCE Icon System V1 — frozen migration baseline (SCE-ICONS-V2-01).
 *
 * Do not mutate V1 SVG assets or approved React geometry from this module.
 */

import { SCE_ICON_REGISTRY, SCE_ICON_REGISTRY_NAMES } from "../registry";
import {
  SCE_APPROVED_MASTER_ASSETS,
  SCE_APPROVED_MASTER_ICON_NAMES,
  type SceApprovedMasterIconName,
} from "../masters/approved-hero-meta";
import {
  SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS,
  SCE_APPROVED_MASTER_BASELINE_FINGERPRINTS,
} from "../masters/approved-hero-fingerprint";

export const SCE_ICON_SYSTEM_V1_LABEL = "SCE Icon System V1" as const;

export type SceV1MasterBaselineRecord = {
  name: SceApprovedMasterIconName;
  semantic: string;
  sourceFile: (typeof SCE_APPROVED_MASTER_ASSETS)[SceApprovedMasterIconName];
  currentFingerprint: string;
  baselineFingerprint: string;
  geometrySource: "approved-master";
  registryCategory: string;
  registryStatus: string;
};

/** Immutable V1 baseline snapshot for all 90 approved masters. */
export function buildSceV1SystemBaseline(): {
  system: typeof SCE_ICON_SYSTEM_V1_LABEL;
  approvedMasters: number;
  registryNames: number;
  masters: SceV1MasterBaselineRecord[];
} {
  const masters = SCE_APPROVED_MASTER_ICON_NAMES.map((name) => {
    const entry = SCE_ICON_REGISTRY[name];
    return {
      name,
      semantic: entry.purpose,
      sourceFile: SCE_APPROVED_MASTER_ASSETS[name],
      currentFingerprint: SCE_APPROVED_HERO_GEOMETRY_FINGERPRINTS[name],
      baselineFingerprint: SCE_APPROVED_MASTER_BASELINE_FINGERPRINTS[name],
      geometrySource: "approved-master" as const,
      registryCategory: entry.category,
      registryStatus: entry.status,
    };
  });

  return {
    system: SCE_ICON_SYSTEM_V1_LABEL,
    approvedMasters: SCE_APPROVED_MASTER_ICON_NAMES.length,
    registryNames: SCE_ICON_REGISTRY_NAMES.length,
    masters,
  };
}
