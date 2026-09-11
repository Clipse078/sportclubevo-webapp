import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

/**
 * Documents platform-only billing permission contract for native billing APIs.
 * Runtime enforcement uses requirePlatformApiPermission (not tenant inheritance).
 */
describe("native billing authorization contract", () => {
  it("uses dedicated platform billing permissions", () => {
    expect(PERMISSIONS.BILLING_VIEW).toBe("billing.view");
    expect(PERMISSIONS.BILLING_MANAGE).toBe("billing.manage");
  });

  it("tenant administration permission set does not include billing permissions", () => {
    expect(TENANT_ADMINISTRATION_PERMISSIONS).not.toContain(PERMISSIONS.BILLING_VIEW);
    expect(TENANT_ADMINISTRATION_PERMISSIONS).not.toContain(PERMISSIONS.BILLING_MANAGE);
  });
});
