/**
 * PLATFORM-UX-01 — final sidebar order, separators, and future module nav entries.
 */

import { describe, it, expect } from "vitest";
import {
  NAV_SECTIONS,
  getTopLevelNavModuleKeys,
  getVisibleNavSections,
} from "@/lib/nav/nav-config";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TENANT_ADMINISTRATION_PERMISSIONS } from "@/lib/permissions/tenant-administration";

const CANONICAL_FULL_ORDER = [
  "dashboard",
  "planung",
  "organisation",
  "mitglieder",
  "anmeldungen",
  "aufgaben",
  "helfereinsaetze",
  "communication",
  "workspace",
  "website",
  "infoboard",
  "trainer-staff",
  "meetings",
  "club-entwicklung",
  "material",
  "finanzen",
  "sponsoring",
  "formulare-freigaben",
  "vorfaelle-disziplin",
  "administration",
];

const FUTURE_MODULE_KEYS = [
  "mitglieder",
  "aufgaben",
  "helfereinsaetze",
  "trainer-staff",
  "formulare-freigaben",
  "vorfaelle-disziplin",
];

function findSection(label: string) {
  return NAV_SECTIONS.find((s) => s.sectionLabel === label);
}

describe("PLATFORM-UX-01 — final sidebar order", () => {
  it("defines top-level modules in canonical order for full permissions", () => {
    const keys = getTopLevelNavModuleKeys(Object.values(PERMISSIONS));
    expect(keys).toEqual(CANONICAL_FULL_ORDER);
  });

  it("places Administration last when visible", () => {
    const keys = getTopLevelNavModuleKeys([
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.USERS_MANAGE_MEMBERSHIPS,
    ]);
    expect(keys.at(-1)).toBe("administration");
  });

  it("exposes all six future modules with correct routes and tenant-admin permissions", () => {
    const routes: Record<string, string> = {
      mitglieder: "/dashboard/mitglieder",
      aufgaben: "/dashboard/aufgaben",
      helfereinsaetze: "/dashboard/helfereinsaetze",
      "trainer-staff": "/dashboard/trainer-staff",
      "formulare-freigaben": "/dashboard/formulare-freigaben",
      "vorfaelle-disziplin": "/dashboard/vorfaelle-disziplin",
    };

    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (FUTURE_MODULE_KEYS.includes(item.key)) {
          expect(item.href).toBe(routes[item.key]);
          expect(item.permissionKeys).toEqual(TENANT_ADMINISTRATION_PERMISSIONS);
        }
      }
    }
  });

  it("omits permission-gated modules while preserving relative order", () => {
    const keys = getTopLevelNavModuleKeys([
      PERMISSIONS.TRAININGS_VIEW,
      PERMISSIONS.REGISTRATIONS_VIEW,
      PERMISSIONS.ROLES_VIEW,
    ]);

    expect(keys).toContain("dashboard");
    expect(keys).toContain("planung");
    expect(keys).toContain("anmeldungen");
    expect(keys).toContain("administration");
    expect(keys).not.toContain("mitglieder");
    expect(keys).not.toContain("website");

    const planungIdx = keys.indexOf("planung");
    const anmeldungenIdx = keys.indexOf("anmeldungen");
    const adminIdx = keys.indexOf("administration");
    expect(planungIdx).toBeLessThan(anmeldungenIdx);
    expect(anmeldungenIdx).toBeLessThan(adminIdx);
  });

  it("shows future modules to tenant Club Admins in correct positions", () => {
    const keys = getTopLevelNavModuleKeys([PERMISSIONS.USERS_MANAGE_MEMBERSHIPS]);

    expect(keys).toEqual([
      "dashboard",
      "mitglieder",
      "aufgaben",
      "helfereinsaetze",
      "communication",
      "trainer-staff",
      "meetings",
      "club-entwicklung",
      "material",
      "finanzen",
      "sponsoring",
      "formulare-freigaben",
      "vorfaelle-disziplin",
    ]);
  });

  it("uses sr-only section labels without Betrieb/Führung/SYSTEM uppercase headings", () => {
    const labels = NAV_SECTIONS.map((s) => s.sectionLabel).filter(Boolean);
    expect(labels).toEqual([
      "Platform",
      "Tagesbetrieb",
      "Öffentliche Kanäle",
      "Führung",
      "Governance",
      "System",
    ]);
    expect(labels).not.toContain("Betrieb");
    expect(labels).not.toContain("BETRIEB");
    expect(labels).not.toContain("FÜHRUNG");
    expect(labels).not.toContain("SYSTEM");
  });

  it("places Dokumente before Website and Infoboard sections", () => {
    const tagesbetrieb = findSection("Tagesbetrieb");
    const oeffentlich = findSection("Öffentliche Kanäle");
    const dokumenteIdx = tagesbetrieb!.items.findIndex((i) => i.key === "workspace");
    const websiteIdx = oeffentlich!.items.findIndex((i) => i.key === "website");
    expect(dokumenteIdx).toBeGreaterThan(-1);
    expect(websiteIdx).toBe(0);
  });

  it("places governance modules before Administration", () => {
    const governance = findSection("Governance");
    const system = findSection("System");
    expect(governance!.items.map((i) => i.key)).toEqual([
      "formulare-freigaben",
      "vorfaelle-disziplin",
    ]);
    expect(system!.items.map((i) => i.key)).toEqual(["administration"]);
  });

  it("shows Commercial billing only for platform billing.view in platform workspace", () => {
    const withBilling = getVisibleNavSections([PERMISSIONS.BILLING_VIEW], "platform");
    const platformSection = withBilling.find((s) => s.sectionLabel === "Platform");
    expect(platformSection?.items.some((i) => i.key === "platform-commercial")).toBe(true);

    const tenantAdmin = getVisibleNavSections(
      [PERMISSIONS.USERS_MANAGE_MEMBERSHIPS],
      "club",
    );
    expect(tenantAdmin.some((s) => s.sectionLabel === "Commercial")).toBe(false);
    expect(tenantAdmin.some((s) => s.sectionLabel === "Platform")).toBe(false);
  });

  it("filters empty sections so separators have modules on both sides", () => {
    const sections = getVisibleNavSections([PERMISSIONS.USERS_VIEW]);
    expect(sections.every((section) => section.items.length > 0)).toBe(true);
    expect(sections.some((s) => s.sectionLabel === "Governance")).toBe(false);
  });
});
