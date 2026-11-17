import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import { deriveTenantRoleVereinsleitungCapabilityFlags } from "@/lib/roles/tenant-role-vl-capability";

describe("deriveTenantRoleVereinsleitungCapabilityFlags", () => {
  it("enables both gates for a full Vereinsentwicklung Vorstandsmitglied selection", () => {
    const keys = [
      PERMISSIONS.WORKSPACE_VIEW,
      PERMISSIONS.TASKS_VIEW,
      ...FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS,
    ];
    expect(deriveTenantRoleVereinsleitungCapabilityFlags(keys)).toEqual({
      canAccessVereinsleitung: true,
      canAttendVereinsleitungMeetings: true,
    });
  });

  it("sets workspace gate from Strategie/Vorhaben without Sitzungen", () => {
    expect(
      deriveTenantRoleVereinsleitungCapabilityFlags([
        PERMISSIONS.TARGETS_VIEW,
        PERMISSIONS.INITIATIVES_VIEW,
      ]),
    ).toEqual({
      canAccessVereinsleitung: true,
      canAttendVereinsleitungMeetings: false,
    });
  });

  it("clears both gates when Vereinsentwicklung rights are removed", () => {
    expect(deriveTenantRoleVereinsleitungCapabilityFlags([PERMISSIONS.TEAMS_VIEW])).toEqual({
      canAccessVereinsleitung: false,
      canAttendVereinsleitungMeetings: false,
    });
  });
});