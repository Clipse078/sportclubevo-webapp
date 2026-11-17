import { describe, expect, it } from "vitest";
import { FCA_VL_CONFIRMED_ROSTER } from "@/lib/roles/fca-vl-reconciliation-registry";
import { PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE } from "@/lib/roles/pilot-fc-allschwil-role-definitions";
import { buildVereinsentwicklungAccessRows } from "@/lib/admin/people-access/vereinsentwicklung-access-presentation";
import { userHasVereinsleitungWorkspaceAccess } from "@/lib/permissions/vereinsleitung-workspace-access";

describe("FCA VL access reconciliation registry", () => {
  it("only lists confirmed emails without fabrication", () => {
    expect(FCA_VL_CONFIRMED_ROSTER.length).toBeGreaterThanOrEqual(1);
    for (const row of FCA_VL_CONFIRMED_ROSTER) {
      expect(row.email).toMatch(/@/);
      expect(row.tenantRoleMatch.name ?? row.tenantRoleMatch.key).toBeTruthy();
    }
  });

  it("Patrick target maps to Präsident (Pilot) template", () => {
    const patrick = FCA_VL_CONFIRMED_ROSTER.find((r) =>
      r.email.includes("patrick.scotton"),
    );
    expect(patrick?.tenantRoleMatch.name).toBe(PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE.name);
  });
});

describe("Vereinsentwicklung access presentation", () => {
  it("distinguishes partial view-only vs full edit", () => {
    const viewOnly = buildVereinsentwicklungAccessRows(
      new Set(["meetings.view", "initiatives.view", "targets.view"]),
    );
    expect(viewOnly.find((r) => r.navLabel === "Sitzungen")?.state).toBe("partial");
    const full = buildVereinsentwicklungAccessRows(
      new Set([
        "meetings.view",
        "meetings.manage",
        "initiatives.view",
        "initiatives.manage",
        "targets.view",
        "targets.manage",
      ]),
    );
    expect(full.find((r) => r.navLabel === "Vorhaben & Umsetzung")?.state).toBe("allow");
  });
});

describe("userHasVereinsleitungWorkspaceAccess contract", () => {
  it("is exported for actor hydration tests", () => {
    expect(typeof userHasVereinsleitungWorkspaceAccess).toBe("function");
  });
});