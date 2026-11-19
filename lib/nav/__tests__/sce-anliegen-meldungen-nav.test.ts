import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  buildAppNavigationModelForUser,
  resolveDomainPanelRightColumnEntries,
  resolveDomainSecondaryNavItems,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";

describe("SCE-ANLIEGEN navigation — Vereinsbetrieb mega-menu", () => {
  it("exposes Anliegen & Meldungen as L3 under Vereinsbetrieb for handler permissions", () => {
    const model = buildAppNavigationModelForUser(
      [PERMISSIONS.MELDUNGEN_HANDLE, PERMISSIONS.USERS_VIEW],
      "club",
    );
    const club = model.domains.find((domain) => domain.id === "club")!;
    const betrieb = resolveDomainSecondaryNavItems(club).find(
      (item) => item.headerGroupId === "club-betrieb",
    );
    expect(betrieb?.label).toBe("Vereinsbetrieb");
    const l3 = resolveSecondaryNavItemModuleLocalChildren(club, betrieb!);
    expect(l3.some((child) => child.key === "anliegen-meldungen")).toBe(true);
    expect(l3.some((child) => child.label === "Anliegen & Meldungen")).toBe(true);
    expect(resolveDomainPanelRightColumnEntries(club, betrieb!).some((e) => e.key === "anliegen-meldungen")).toBe(
      true,
    );
  });

  it("keeps submit-only access on the Anliegen nav item without internal destinations", () => {
    const model = buildAppNavigationModelForUser([PERMISSIONS.MELDUNGEN_SUBMIT], "club");
    const club = model.domains.find((domain) => domain.id === "club")!;
    const betrieb = resolveDomainSecondaryNavItems(club).find(
      (item) => item.headerGroupId === "club-betrieb",
    );
    expect(betrieb).toBeDefined();
    const l3 = resolveDomainPanelRightColumnEntries(club, betrieb!);
    expect(l3).toHaveLength(1);
    expect(l3[0]?.key).toBe("anliegen-meldungen");
    expect(l3[0]?.href).toBe("/dashboard/anliegen-meldungen");
  });

  it("omits Vereinsbetrieb when no club-betrieb destinations are authorized", () => {
    const model = buildAppNavigationModelForUser([PERMISSIONS.EVENTS_VIEW], "club");
    const club = model.domains.find((domain) => domain.id === "club")!;
    const betrieb = resolveDomainSecondaryNavItems(club).find(
      (item) => item.headerGroupId === "club-betrieb",
    );
    expect(betrieb).toBeUndefined();
  });
});