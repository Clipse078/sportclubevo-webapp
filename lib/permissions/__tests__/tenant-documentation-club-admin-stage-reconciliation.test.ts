import { describe, expect, it } from "vitest";

import {
  assertTenantDocumentationClubAdminScopeGate,
  TENANT_DOCUMENTATION_CLUB_ADMIN_PERMISSION_KEYS,
} from "@/lib/permissions/tenant-documentation-club-admin-stage-reconciliation";

describe("tenant documentation FCA club admin scope gate", () => {
  const roleKey = "club_admin__fc-allschwil";

  it("passes when only the four dokumentation keys would assign on FCA club admin", () => {
    const grants = TENANT_DOCUMENTATION_CLUB_ADMIN_PERMISSION_KEYS.map((permissionKey) => ({
      action: "assigned" as const,
      roleKey,
      permissionKey,
    }));
    const result = assertTenantDocumentationClubAdminScopeGate(grants, roleKey);
    expect(result.passed).toBe(true);
    expect(result.wouldAssign).toHaveLength(4);
  });

  it("fails when another role appears in the proposal", () => {
    const grants = [
      {
        action: "assigned" as const,
        roleKey: "club_admin__other-tenant",
        permissionKey: TENANT_DOCUMENTATION_CLUB_ADMIN_PERMISSION_KEYS[0],
      },
    ];
    const result = assertTenantDocumentationClubAdminScopeGate(grants, roleKey);
    expect(result.passed).toBe(false);
  });
});