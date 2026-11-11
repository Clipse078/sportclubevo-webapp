import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  VEREINSLEITUNG_DEMO_PERMISSIONS,
  VEREINSLEITUNG_STRATEGIC_VIEW_PERMISSIONS,
} from "@/lib/nav/vereinsleitung-access";
import { buildAppNavigationModelForUser, resolveDomainSecondaryNavItems } from "@/lib/nav/app-navigation-model";

describe("SCE-CD-02R2 — Club-Betrieb header routing", () => {
  it("routes VL workspace Club-Betrieb to operational Helfereinsätze, not Meetings or Material demo", () => {
    const keys = [
      ...new Set([
        ...VEREINSLEITUNG_STRATEGIC_VIEW_PERMISSIONS,
        ...VEREINSLEITUNG_DEMO_PERMISSIONS,
        PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
      ]),
    ];
    const model = buildAppNavigationModelForUser(keys, "club", { vereinsleitungWorkspace: true });
    const club = model.domains.find((d) => d.id === "club")!;
    const betrieb = resolveDomainSecondaryNavItems(club).find((item) => item.headerGroupId === "club-betrieb");
    expect(betrieb?.href).toBe("/dashboard/helfereinsaetze");
    expect(betrieb?.key).toBe("helfereinsaetze");
    expect(betrieb?.href).not.toContain("/vereinsleitung/meetings");
    expect(betrieb?.href).not.toContain("/vereinsleitung/material");
  });
});
