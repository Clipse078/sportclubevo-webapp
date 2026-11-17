import { describe, expect, it } from "vitest";
import {
  VL_CONTRIBUTOR_ROLE_SYNC_PERMISSION_KEYS,
  buildVlContributorRoleSyncDiff,
} from "@/lib/admin/vl-onboarding/vl-contributor-role-sync-diff";
import { FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";

describe("vl contributor role sync diff", () => {
  it("returns exactly eight permission keys", () => {
    expect(VL_CONTRIBUTOR_ROLE_SYNC_PERMISSION_KEYS).toHaveLength(8);
    expect([...VL_CONTRIBUTOR_ROLE_SYNC_PERMISSION_KEYS]).toEqual([
      ...FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys,
    ]);
  });

  it("marks role missing when snapshot is null", () => {
    const diff = buildVlContributorRoleSyncDiff(null);
    expect(diff.roleMissing).toBe(true);
    expect(diff.missingPermissionKeys).toHaveLength(8);
    expect(diff.wouldApply).toBe(true);
  });

  it("reports missing keys when partially provisioned", () => {
    const diff = buildVlContributorRoleSyncDiff({
      permissionKeys: VL_CONTRIBUTOR_ROLE_SYNC_PERMISSION_KEYS.slice(0, 6),
      canAccessVereinsleitung: true,
      canAttendVereinsleitungMeetings: false,
    });
    expect(diff.missingPermissionKeys).toHaveLength(2);
    expect(diff.needsVlCapabilityFlags).toBe(true);
  });
});