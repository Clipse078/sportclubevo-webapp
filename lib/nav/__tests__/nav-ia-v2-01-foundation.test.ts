/**
 * SCE-NAV-IA-V2-01 — architecture foundation audit tests (spec baseline).
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";
import {
  buildCurrentInventoryForPermissions,
  buildTargetMatrixFromInventory,
  computeCompletenessBaseline,
} from "@/lib/nav/nav-ia-v2/build-current-inventory";
import {
  buildOrganisationMigrationRecords,
  CLUB_TARGET_L2_GROUPS,
  PUBLISHING_TARGET_L2_GROUPS,
  ROUTES_REQUIRING_CHANGE,
  TARGET_L1_SCE_ICONS,
} from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import { NAV_IA_V2_DEPTH_CONTRACT } from "@/lib/nav/nav-ia-v2/contracts";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

describe("SCE-NAV-IA-V2-01 foundation", () => {
  it("recalculates club-admin navigation completeness baseline on STAGE", () => {
    const baseline = computeCompletenessBaseline(CLUB_ADMIN_KEYS, "club");
    expect(baseline.visibleDestinations).toBe(60);
    expect(baseline.reachableDestinations).toBe(60);
    expect(baseline.orphanedDestinations).toEqual([]);
    expect(baseline.duplicateDestinations.length).toBeGreaterThan(0);
  });

  it("maps every club-admin visible destination exactly once in the target matrix", () => {
    const inventory = buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club");
    const matrix = buildTargetMatrixFromInventory(inventory);
    expect(matrix).toHaveLength(inventory.length);
    const keys = matrix.map((row) => row.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(matrix.every((row) => row.routePreserved)).toBe(true);
  });

  it("closes organisation → club migration with REVIEW = 0", () => {
    const inventory = buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club");
    const migration = buildOrganisationMigrationRecords(inventory);
    expect(migration.length).toBe(15);
    const review = migration.filter((row) => row.disposition === "REVIEW");
    expect(review).toEqual([]);
    const toClub = migration.filter((row) => row.disposition === "MOVE_TO_CLUB");
    expect(toClub.length).toBe(migration.length);
  });

  it("defines publishing L2 groups from live website/infoboard destinations only", () => {
    const inventory = buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club");
    const publishingKeys = inventory
      .filter((row) => row.key.startsWith("website") || row.key.startsWith("infoboard"))
      .map((row) => row.key);
    const grouped = new Set<string>(PUBLISHING_TARGET_L2_GROUPS.flatMap((g) => [...g.keys]));
    for (const key of publishingKeys) {
      expect(grouped.has(key)).toBe(true);
    }
  });

  it("uses existing SCE V2 publish master for Publishing L1 icon", () => {
    expect(TARGET_L1_SCE_ICONS.publishing).toBe("publish");
  });

  it("keeps routes stable (no mandatory URL changes)", () => {
    expect(ROUTES_REQUIRING_CHANGE).toEqual([]);
  });

  it("exports machine-readable target IA matrix JSON artifact", () => {
    const inventory = buildCurrentInventoryForPermissions(CLUB_ADMIN_KEYS, "club");
    const matrix = buildTargetMatrixFromInventory(inventory);
    const payload = {
      programme: "SCE-NAV-IA-V2-01",
      generatedFrom: "lib/nav/nav-config.ts",
      clubAdminPermissionCount: CLUB_ADMIN_KEYS.length,
      destinations: matrix,
      publishingL2: PUBLISHING_TARGET_L2_GROUPS,
      clubL2: CLUB_TARGET_L2_GROUPS,
      depthContract: NAV_IA_V2_DEPTH_CONTRACT,
    };
    const outPath = join(process.cwd(), "docs/navigation/SCE-NAV-IA-V2-01-target-ia-matrix.json");
    writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    expect(matrix.length).toBe(60);
  });

  it("has no unexpected unregistered authenticated static routes after exclusions", () => {
    const baseline = computeCompletenessBaseline(CLUB_ADMIN_KEYS, "club");
    expect(baseline.unregisteredAuthenticatedRoutes).toEqual([]);
  });
});
