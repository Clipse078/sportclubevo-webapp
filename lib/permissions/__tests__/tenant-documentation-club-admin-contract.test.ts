import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  computeTenantClubAdminPermissionDrift,
  isTenantClubAdminDelegatablePermission,
  TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS,
} from "@/lib/permissions/tenant-club-admin-permission-contract";

const DOC_KEYS = [
  PERMISSIONS.TENANT_DOCUMENTATION_VIEW,
  PERMISSIONS.TENANT_DOCUMENTATION_EDIT,
  PERMISSIONS.TENANT_DOCUMENTATION_PUBLISH,
  PERMISSIONS.TENANT_DOCUMENTATION_MANAGE,
] as const;

describe("tenant documentation × Club Admin contract", () => {
  it("includes all four Dokumentation keys in the delegatable contract", () => {
    for (const key of DOC_KEYS) {
      expect(
        isTenantClubAdminDelegatablePermission({
          key,
          scope: "TENANT",
          grantableByAdmin: true,
        }),
      ).toBe(true);
    }
  });

  it("lists Dokumentation keys in regression coverage", () => {
    for (const key of DOC_KEYS) {
      expect(TENANT_CLUB_ADMIN_DELEGATION_REGRESSION_KEYS).toContain(key);
    }
  });

  it("flags missing Dokumentation keys on materialized Club Admin as drift", () => {
    const drift = computeTenantClubAdminPermissionDrift(DOC_KEYS, [
      PERMISSIONS.TEAMS_VIEW,
    ]);
    expect(drift.missingFromClubAdmin.sort()).toEqual([...DOC_KEYS].sort());
  });
});