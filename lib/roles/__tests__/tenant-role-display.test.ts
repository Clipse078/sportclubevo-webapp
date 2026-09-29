import { describe, expect, it } from "vitest";
import {
  formatTenantRoleDisplayLabel,
  tenantRoleSelectorDiscoveryWhere,
} from "@/lib/roles/tenant-role-display";

describe("tenant-role-display", () => {
  it("formats archived role labels for retained selections", () => {
    expect(formatTenantRoleDisplayLabel("Club Admin", false)).toBe("Club Admin");
    expect(formatTenantRoleDisplayLabel("Club Admin", true)).toBe("Club Admin (Archiviert)");
  });

  it("discovery where restricts to active tenant roles", () => {
    expect(tenantRoleSelectorDiscoveryWhere("tenant-x")).toEqual({
      tenantId: "tenant-x",
      scope: "TENANT",
      isArchived: false,
    });
  });
});
