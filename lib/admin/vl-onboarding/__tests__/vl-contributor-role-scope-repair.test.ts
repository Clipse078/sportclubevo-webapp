import { describe, expect, it } from "vitest";
import {
  FCA_VL_CONTRIBUTOR_ROLE_STABLE_KEY,
  buildVlContributorRoleScopeRepairPlan,
} from "@/lib/admin/vl-onboarding/vl-contributor-role-sync-diff";

describe("VL contributor role scope repair plan", () => {
  it("repairs PLATFORM → TENANT in place without duplicate", () => {
    const plan = buildVlContributorRoleScopeRepairPlan({
      id: "role-platform-1",
      scope: "PLATFORM",
      tenantId: "tenant-fca",
      permissionKeys: ["targets.view", "meetings.view"],
      canAccessVereinsleitung: false,
      canAttendVereinsleitungMeetings: false,
      assignmentCount: 3,
      duplicateTenantScopedRoleId: null,
    });

    expect(plan.stableRoleKey).toBe(FCA_VL_CONTRIBUTOR_ROLE_STABLE_KEY);
    expect(plan.beforeScope).toBe("PLATFORM");
    expect(plan.afterScope).toBe("TENANT");
    expect(plan.scopeRepairNeeded).toBe(true);
    expect(plan.wouldCreateDuplicate).toBe(false);
    expect(plan.ownershipAmbiguous).toBe(false);
    expect(plan.assignmentCount).toBe(3);
    expect(plan.wouldApplyInPlace).toBe(true);
  });

  it("flags ambiguous ownership when a TENANT duplicate already exists", () => {
    const plan = buildVlContributorRoleScopeRepairPlan({
      id: "role-platform-1",
      scope: "PLATFORM",
      tenantId: "tenant-fca",
      permissionKeys: [],
      canAccessVereinsleitung: false,
      canAttendVereinsleitungMeetings: false,
      assignmentCount: 1,
      duplicateTenantScopedRoleId: "role-tenant-dup",
    });

    expect(plan.ownershipAmbiguous).toBe(true);
    expect(plan.wouldCreateDuplicate).toBe(true);
    expect(plan.wouldApplyInPlace).toBe(false);
  });
});