/**
 * SCE-NAV-IA-V2-02 — compare live navigation model against target IA matrix.
 */

import type { AppNavigationModel } from "@/lib/nav/app-navigation-model";
import {
  flattenVisibleCanonicalNavLeaves,
  resolveDomainSecondaryNavItems,
} from "@/lib/nav/app-navigation-model";
import type { NavSection } from "@/lib/nav/nav-config";
import { getNavDestinationSceIconName } from "@/lib/nav/nav-destination-sce-icons";
import {
  mapNavIaV2TargetL1ToAppDomainId,
  resolveNavKeyTargetL1,
} from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import type { TargetIaRecord } from "@/lib/nav/nav-ia-v2/types";

export type TargetMatrixMismatch = {
  key: string;
  field: string;
  expected: string;
  actual: string;
};

function resolveRuntimeTargetL1ForLeaf(
  key: string,
  parentKey: string | null,
): TargetIaRecord["targetL1"] {
  const topLevelKey = parentKey ?? key;
  return resolveNavKeyTargetL1(topLevelKey, null);
}

export function auditRuntimeModelAgainstTargetMatrix(
  sections: NavSection[],
  model: AppNavigationModel,
  matrix: TargetIaRecord[],
): {
  mapped: number;
  mismatches: TargetMatrixMismatch[];
  unmapped: string[];
  duplicateCanonicalNodes: string[];
} {
  const matrixByKey = new Map(matrix.map((row) => [row.key, row]));
  const leaves = flattenVisibleCanonicalNavLeaves(sections);
  const mismatches: TargetMatrixMismatch[] = [];
  const unmapped: string[] = [];

  for (const leaf of leaves) {
    const expected = matrixByKey.get(leaf.key);
    if (!expected) {
      unmapped.push(leaf.key);
      continue;
    }

    const runtimeTargetL1 = resolveRuntimeTargetL1ForLeaf(leaf.key, leaf.parentKey);
    const runtimeDomainId = mapNavIaV2TargetL1ToAppDomainId(runtimeTargetL1);
    const expectedDomainId = mapNavIaV2TargetL1ToAppDomainId(expected.targetL1);

    if (runtimeDomainId !== expectedDomainId) {
      mismatches.push({
        key: leaf.key,
        field: "targetL1",
        expected: String(expectedDomainId),
        actual: String(runtimeDomainId),
      });
    }

    if (leaf.href !== expected.route) {
      mismatches.push({
        key: leaf.key,
        field: "route",
        expected: expected.route,
        actual: leaf.href,
      });
    }

    const icon = getNavDestinationSceIconName(leaf.key);
    if (icon !== expected.icon) {
      mismatches.push({
        key: leaf.key,
        field: "icon",
        expected: String(expected.icon),
        actual: String(icon),
      });
    }
  }

  const canonicalSecondaryKeys = new Set<string>();
  const duplicateCanonicalNodes: string[] = [];
  for (const domain of model.domains) {
    for (const item of resolveDomainSecondaryNavItems(domain)) {
      if (canonicalSecondaryKeys.has(item.key)) {
        duplicateCanonicalNodes.push(item.key);
      }
      canonicalSecondaryKeys.add(item.key);
    }
  }

  return {
    mapped: leaves.length - unmapped.length,
    mismatches,
    unmapped,
    duplicateCanonicalNodes,
  };
}
