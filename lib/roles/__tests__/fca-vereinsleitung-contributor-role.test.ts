import { describe, expect, it } from "vitest";
import {
  FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE,
  PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE,
  PILOT_FORBIDDEN_PERMISSION_KEYS,
} from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS } from "@/lib/roles/fca-vereinsleitung-vl-supplements";
import { PERMISSIONS } from "@/lib/permissions/permissions";

describe("FCA Vereinsleitung contributor preset", () => {
  it("includes strategic VL permissions only at minimum established rights", () => {
    for (const key of FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS) {
      expect(FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys).toContain(key);
    }
  });

  it("does not clone president registrations/news permissions", () => {
    expect(FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys).not.toContain(
      PERMISSIONS.REGISTRATIONS_EDIT,
    );
    expect(FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys).not.toContain(
      PERMISSIONS.NEWS_MANAGE,
    );
    expect(FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys).not.toContain(
      PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
    );
  });

  it("president role remains a separate superset", () => {
    expect(PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.permissionKeys.length).toBeGreaterThan(
      FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys.length,
    );
    for (const forbidden of PILOT_FORBIDDEN_PERMISSION_KEYS) {
      expect(FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE.permissionKeys).not.toContain(forbidden);
    }
  });
});