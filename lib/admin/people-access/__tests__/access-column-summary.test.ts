import { describe, expect, it } from "vitest";
import { buildAccessColumnSummary } from "@/lib/admin/people-access/access-column-summary";
import type { TenantUserItem } from "@/lib/users/queries";

const base: TenantUserItem = {
  userId: "u1",
  firstName: "A",
  lastName: "B",
  name: "A B",
  email: "a@b.ch",
  userIsActive: true,
  membershipIsActive: true,
  joinedAt: null,
  lastLoginAt: null,
  roles: [],
  scopedRoles: [],
  platformRoles: [],
  isPlatformSystemIdentity: false,
  linkedPersonId: null,
  linkedPersonName: null,
  pendingInvitation: false,
};

describe("buildAccessColumnSummary", () => {
  it("shows role and tenant-wide scope for club admin", () => {
    const summary = buildAccessColumnSummary({
      ...base,
      roles: [{ id: "r1", name: "Club Admin", key: "club_admin__x" }],
    });
    expect(summary.primary).toBe("Club Admin");
    expect(summary.secondary).toBe("Gesamter Verein");
  });

  it("shows trainer with org unit", () => {
    const summary = buildAccessColumnSummary({
      ...base,
      scopedRoles: [
        { id: "r2", name: "Trainer/in", key: "trainer", orgUnitId: "ou1", orgUnitName: "Kinderfussball" },
      ],
    });
    expect(summary.primary).toBe("Trainer/in");
    expect(summary.secondary).toBe("Kinderfussball");
  });
});
