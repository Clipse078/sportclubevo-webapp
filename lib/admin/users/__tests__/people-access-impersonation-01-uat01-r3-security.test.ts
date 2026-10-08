import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  PATRICK_SCOTTON_PILOT_VIEWER_ROLE,
  PILOT_FORBIDDEN_PERMISSION_KEYS,
  SANDRA_FISCHER_SPIELBETRIEB_ROLE,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";

describe("UAT-PERM-01R3 security negatives (automated personas)", () => {
  const sandra = [...SANDRA_FISCHER_SPIELBETRIEB_ROLE.permissionKeys];
  const readOnly = [...PATRICK_SCOTTON_PILOT_VIEWER_ROLE.permissionKeys];

  for (const forbidden of [
    PERMISSIONS.USERS_IMPERSONATE_TENANT,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.PEOPLE_VIEW,
    PERMISSIONS.FACILITIES_MANAGE,
  ]) {
    it(`Sandra lacks ${forbidden}`, () => {
      expect(sandra).not.toContain(forbidden);
    });
  }

  it("Sandra does not inherit forbidden pilot keys", () => {
    for (const key of PILOT_FORBIDDEN_PERMISSION_KEYS) {
      expect(sandra).not.toContain(key);
    }
  });

  it("Präsident pilot shares Sandra allocation manage without domain manage", () => {
    expect(readOnly).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_VIEW);
    expect(readOnly).toContain(PERMISSIONS.PLANNING_ALLOCATIONS_MANAGE);
    expect(readOnly).not.toContain(PERMISSIONS.TRAININGS_MANAGE);
    expect(readOnly).not.toContain(PERMISSIONS.EVENTS_MANAGE);
    expect(readOnly).not.toContain(PERMISSIONS.USERS_IMPERSONATE_TENANT);
  });
});
