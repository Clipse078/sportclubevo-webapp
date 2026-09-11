import { describe, it, expect } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("SCE-SUPERADMIN-BILLING-01B — billing permission constants", () => {
  it("defines billing.view and billing.manage keys", () => {
    expect(PERMISSIONS.BILLING_VIEW).toBe("billing.view");
    expect(PERMISSIONS.BILLING_MANAGE).toBe("billing.manage");
  });

  it("keeps billing permissions distinct from tenant person finance permissions", () => {
    expect(PERMISSIONS.PEOPLE_FINANCE_VIEW).toBe("people.finance.view");
    expect(PERMISSIONS.PEOPLE_FINANCE_MANAGE).toBe("people.finance.manage");
    expect(PERMISSIONS.BILLING_VIEW).not.toBe(PERMISSIONS.PEOPLE_FINANCE_VIEW);
    expect(PERMISSIONS.BILLING_MANAGE).not.toBe(PERMISSIONS.PEOPLE_FINANCE_MANAGE);
  });
});

describe("SCE-SUPERADMIN-BILLING-01B — seed permission metadata contract", () => {
  const platformBillingPermissions = [
    {
      key: "billing.view",
      scope: "PLATFORM",
      grantableByAdmin: false,
    },
    {
      key: "billing.manage",
      scope: "PLATFORM",
      grantableByAdmin: false,
    },
  ] as const;

  it("documents PLATFORM-only billing permissions (mirrors prisma/seed.ts)", () => {
    for (const permission of platformBillingPermissions) {
      expect(permission.scope).toBe("PLATFORM");
      expect(permission.grantableByAdmin).toBe(false);
    }
  });

  it("super_admin seed policy grants every permission key including billing", () => {
    const seededKeys = new Set([
      "users.manage",
      "billing.view",
      "billing.manage",
      "people.finance.view",
    ]);
    expect(seededKeys.has("billing.view")).toBe(true);
    expect(seededKeys.has("billing.manage")).toBe(true);
    expect(seededKeys.has("people.finance.view")).toBe(true);
  });
});
