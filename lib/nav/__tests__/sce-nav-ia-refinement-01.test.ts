/**
 * SCE-NAV-IA-REFINEMENT-01 — navigation IA refinement regression contract.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppNavigationModelForUser,
  isDomainPanelSecondaryItemRouteActive,
  resolveActiveAppNavigation,
  resolveDomainNavigationPanelInitialL2Key,
  resolveDomainPanelRightColumnEntries,
  resolveDomainSecondaryNavItems,
  resolveSecondaryNavItemModuleLocalChildren,
} from "@/lib/nav/app-navigation-model";
import { ADMIN_TARGET_L2_GROUPS, CLUB_TARGET_L2_GROUPS } from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import { resolveNavKeyTargetL1, resolveTargetL2ForNavKey } from "@/lib/nav/nav-ia-v2/target-ia-matrix";
import { getVisibleNavSections, NAV_SECTIONS } from "@/lib/nav/nav-config";
import { PERMISSIONS, type PermissionKey } from "@/lib/permissions/permissions";

const CLUB_ADMIN_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

function findSystemNavItem(key: string) {
  const system = NAV_SECTIONS.find((s) => s.sectionLabel === "System");
  return system?.items.find((i) => i.key === key);
}

function readCss(): string {
  return readFileSync(join(process.cwd(), "app/(admin)/global-app-navigation.css"), "utf8");
}

describe("SCE-NAV-IA-REFINEMENT-01 navigation contract", () => {
  it("maps Aufgaben to Verein (club) across list, create and detail routes", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    for (const pathname of [
      "/dashboard/aufgaben",
      "/dashboard/aufgaben/neu",
      "/dashboard/aufgaben/cmwg72a60000008k1hxaaqhet",
      "/dashboard/aufgaben/cmwg72a60000008k1hxaaqhet/edit",
    ]) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(active.activeDomainId, pathname).toBe("club");
      expect(active.activeDestinationKey, pathname).toBe("aufgaben");
    }
    expect(resolveNavKeyTargetL1("aufgaben")).toBe("club");
    expect(resolveTargetL2ForNavKey("aufgaben")).toBe("Aufgaben");
  });

  it("exposes Aufgaben as a direct Verein mega-menu destination (not under Personen & Teams)", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const club = model.domains.find((d) => d.id === "club")!;
    const secondary = resolveDomainSecondaryNavItems(club);
    const aufgabenEntry = secondary.find((item) => item.label === "Aufgaben");
    expect(aufgabenEntry).toMatchObject({
      key: "aufgaben",
      href: "/dashboard/aufgaben",
    });
    expect(resolveSecondaryNavItemModuleLocalChildren(club, aufgabenEntry!)).toEqual([]);

    const peopleGroup = CLUB_TARGET_L2_GROUPS.find((g) => g.id === "people-teams");
    expect(peopleGroup?.keys).not.toContain("aufgaben");
    expect(secondary.some((item) => item.label === "Personen & Teams")).toBe(true);
  });

  it("focuses open Verein panel on Aufgaben for task routes without unrelated L3 column", () => {
    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const club = model.domains.find((d) => d.id === "club")!;
    const items = resolveDomainSecondaryNavItems(club);
    const active = resolveActiveAppNavigation("/dashboard/aufgaben", model);
    const initial = resolveDomainNavigationPanelInitialL2Key(club, items, active);
    expect(initial).toBe("aufgaben");
    expect(
      isDomainPanelSecondaryItemRouteActive(
        "/dashboard/aufgaben",
        club,
        items.find((i) => i.key === "aufgaben")!,
        active.activeDestinationKey,
        active.activeChildKey,
        items,
      ),
    ).toBe(true);
  });

  it("places Anbieter-Zuordnung, Referenzvereine and Wettkämpfe under Administration", () => {
    expect(findSystemNavItem("provider-mapping")?.href).toBe("/dashboard/teams/provider-mapping");
    expect(findSystemNavItem("vereine")?.label).toBe("Referenzvereine");
    expect(findSystemNavItem("competitions")?.href).toBe("/dashboard/competitions");

    const integrationGroup = ADMIN_TARGET_L2_GROUPS.find((g) => g.id === "integrationen");
    expect(integrationGroup?.keys).toEqual(
      expect.arrayContaining(["provider-mapping", "admin-integrations", "communication-email-sender"]),
    );
    const stammdaten = ADMIN_TARGET_L2_GROUPS.find((g) => g.id === "stammdaten");
    expect(stammdaten?.keys).toEqual(expect.arrayContaining(["vereine", "competitions"]));

    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    for (const pathname of [
      "/dashboard/teams/provider-mapping",
      "/dashboard/vereine",
      "/dashboard/competitions",
      "/dashboard/communication/email-sender",
    ]) {
      const active = resolveActiveAppNavigation(pathname, model);
      expect(active.activeDomainId, pathname).toBe("admin");
    }
  });

  it("labels Administration hub System & Zugänge with Übersicht in the panel", () => {
    const adminGroup = ADMIN_TARGET_L2_GROUPS.find((g) => g.id === "administration");
    expect(adminGroup?.label).toBe("System & Zugänge");

    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const admin = model.domains.find((d) => d.id === "admin")!;
    const secondary = resolveDomainSecondaryNavItems(admin);
    const systemGroup = secondary.find((item) => item.headerGroupId === "administration");
    expect(systemGroup?.label).toBe("System & Zugänge");

    const l3 = resolveDomainPanelRightColumnEntries(admin, systemGroup!);
    expect(l3.some((entry) => entry.label === "Übersicht")).toBe(true);
    expect(l3.some((entry) => entry.label === "Administration Übersicht")).toBe(false);
    expect(l3.some((entry) => entry.label === "System & Zugänge Übersicht")).toBe(false);
  });

  it("keeps Personen and Teams as a single canonical Verein home (no Organisation duplicates)", () => {
    const tagesbetrieb = NAV_SECTIONS.find((s) => s.sectionLabel === "Tagesbetrieb");
    const organisation = tagesbetrieb?.items.find((i) => i.key === "organisation");
    expect(organisation?.children ?? []).toHaveLength(0);

    const peopleGroup = CLUB_TARGET_L2_GROUPS.find((g) => g.id === "people-teams");
    expect(peopleGroup?.keys).toEqual(
      expect.arrayContaining(["teams", "personen", "mitglieder"]),
    );
    expect(peopleGroup?.keys).not.toContain("provider-mapping");
  });

  it("exposes Kommunikation destinations without E-Mail-Absender in the domain hub", () => {
    const tagesbetrieb = NAV_SECTIONS.find((s) => s.sectionLabel === "Tagesbetrieb");
    const communication = tagesbetrieb?.items.find((i) => i.key === "communication");
    const childKeys = communication?.children?.map((c) => c.key) ?? [];
    expect(childKeys).toEqual([
      "communication-overview",
      "communication-mitteilungen",
      "communication-kampagnen",
      "communication-zielgruppen",
    ]);

    const model = buildAppNavigationModelForUser(CLUB_ADMIN_KEYS, "club");
    const communicationDomain = model.domains.find((d) => d.id === "communication")!;
    const secondary = resolveDomainSecondaryNavItems(communicationDomain);
    expect(secondary.map((item) => item.key)).toEqual(
      expect.arrayContaining([
        "communication-overview",
        "communication-mitteilungen",
        "communication-kampagnen",
        "communication-zielgruppen",
      ]),
    );
    expect(secondary.map((item) => item.key)).not.toContain("communication-email-sender");
  });

  it("preserves permission-filtered access without requiring tenant admin for Stammdaten routes", () => {
    const orgOnly = getVisibleNavSections(
      [PERMISSIONS.ORG_VIEW, PERMISSIONS.ORG_MANAGE],
      "club",
    );
    const flatKeys = orgOnly.flatMap((s) =>
      s.items.flatMap((i) => [i.key, ...(i.children?.map((c) => c.key) ?? [])]),
    );
    expect(flatKeys).toContain("vereine");
    expect(flatKeys).toContain("organisation");
    expect(flatKeys).not.toContain("administration");

    const tasksOnly = buildAppNavigationModelForUser([PERMISSIONS.TASKS_VIEW], "club");
    expect(tasksOnly.destinations.some((d) => d.key === "aufgaben")).toBe(true);
    expect(tasksOnly.domains.some((d) => d.id === "communication")).toBe(false);
  });

  it("separates explored L2 submenu (orange) from route-active L2 (subtle marker)", () => {
    const css = readCss();
    expect(css).toMatch(/\.sce-domain-nav-panel-l2-control--selected[\s\S]*color:\s*var\(--sce-primary\)/);
    expect(css).toMatch(
      /\.sce-domain-nav-panel-l2-link--active[\s\S]*color:\s*var\(--foreground\)/,
    );
    expect(css).toMatch(/\.sce-domain-nav-panel-l2-label::after/);
    expect(css).toMatch(/\.sce-domain-nav-panel-l3-link--active[\s\S]*color:\s*var\(--sce-primary\)/);

    const panel = readFileSync(
      join(process.cwd(), "components/sce/navigation/SceDomainNavigationPanel.tsx"),
      "utf8",
    );
    expect(panel).toContain("sce-domain-nav-panel-l2-control--selected");
    expect(panel).toContain("setUserL2Key(null)");
    expect(panel).toContain("[autoL2Key, domain.id]");
  });
});