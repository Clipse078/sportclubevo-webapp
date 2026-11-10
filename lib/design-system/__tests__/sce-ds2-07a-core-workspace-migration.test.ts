/**
 * SCE-DS2-07A — core workspace migration governance
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_07A_PACKAGE_KEY,
  SCE_DS2_07A_PREEXISTING_CANONICAL_DESTINATIONS,
  SCE_DS2_07A_REDIRECT_ALIASES,
  SCE_DS2_07A_RENDERABLE_ROUTES,
  SCE_DS2_07A_ROUTE_DISCOVERY_BASELINE,
} from "@/lib/design-system/sce-ds2-07a-meta";
import { SCE_DS2_06_ROUTE_INVENTORY } from "@/lib/design-system/sce-ds2-06-route-inventory";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-07A core workspace migration", () => {
  it("documents delivery and distinguishes renderable routes from redirect aliases", () => {
    const doc = readRepo("docs/design-system-v2/20-ds2-07a-core-workspace-migration-delivery.md");
    expect(doc).toContain(SCE_DS2_07A_PACKAGE_KEY);
    expect(doc).toContain("not a visual surface");
    expect(SCE_DS2_07A_RENDERABLE_ROUTES).toHaveLength(4);
    expect(SCE_DS2_07A_REDIRECT_ALIASES).toHaveLength(2);
  });

  it("composes FormPagePattern with SceWorkspaceChrome", () => {
    const pattern = readRepo("components/ui/patterns/FormPagePattern.tsx");
    expect(pattern).toContain("SceWorkspaceChrome");
    expect(pattern).not.toContain("PageBreadcrumbs");
  });

  it("preserves finance income_statement redirect without alias chrome", () => {
    const page = readRepo("app/(admin)/dashboard/finance/income_statement/page.tsx");
    expect(page).toContain('redirect("/dashboard/finance/reports")');
    expect(page).not.toContain("SceWorkspaceChrome");
    expect(
      existsSync(join(ROOT, "app/(admin)/dashboard/finance/income_statement/layout.tsx")),
    ).toBe(false);
  });

  it("preserves teams/new redirect to registration wizard without alias chrome", () => {
    const page = readRepo("app/(admin)/dashboard/teams/new/page.tsx");
    expect(page).toContain('redirect("/dashboard/teams/register")');
    expect(page).not.toContain("SceWorkspaceChrome");
    expect(existsSync(join(ROOT, "app/(admin)/dashboard/teams/new/layout.tsx"))).toBe(false);
  });

  it("puts canonical chrome on the teams/register destination, not the alias", () => {
    const registerPage = readRepo("app/(admin)/dashboard/teams/register/page.tsx");
    expect(registerPage).toContain("PERMISSIONS.TEAMS_MANAGE");
    expect(registerPage).toContain("SceWorkspaceChrome");
    const wizard = readRepo("components/admin/teams/registration/TeamRegistrationWizard.tsx");
    expect(wizard).toContain("SceWorkspaceChrome");
    expect(wizard).not.toContain("PageBreadcrumbs");
  });

  it("keeps vereine/new composer fallback without FormPagePattern on page", () => {
    const page = readRepo("app/(admin)/dashboard/vereine/new/page.tsx");
    expect(page).toContain('layout="composer"');
    expect(page).not.toMatch(/\bFormPagePattern\b/);
    expect(page).toContain("SceWorkspaceChrome");
  });

  it("marks renderable migrated routes canonical and leaves redirect aliases non-canonical", () => {
    expect(SCE_DS2_06_ROUTE_INVENTORY.length).toBe(SCE_DS2_07A_ROUTE_DISCOVERY_BASELINE);

    for (const route of SCE_DS2_07A_RENDERABLE_ROUTES) {
      const entry = SCE_DS2_06_ROUTE_INVENTORY.find((e) => e.route === route);
      expect(entry, `missing inventory row for ${route}`).toBeDefined();
      expect(entry?.pageArchitecture, route).toBe("canonical");
      expect(entry?.headerFinanceAligned, route).toBe(true);
    }

    for (const alias of SCE_DS2_07A_REDIRECT_ALIASES) {
      const entry = SCE_DS2_06_ROUTE_INVENTORY.find((e) => e.route === alias.route);
      expect(entry, `missing inventory row for ${alias.route}`).toBeDefined();
      expect(entry?.pageArchitecture, alias.route).not.toBe("canonical");
      expect(entry?.headerFinanceAligned, alias.route).toBe(false);
      expect(entry?.action, alias.route).toContain("redirect alias");
      expect(entry?.action, alias.route).toContain(alias.destination);

      const destination = SCE_DS2_06_ROUTE_INVENTORY.find((e) => e.route === alias.destination);
      expect(destination, `missing destination ${alias.destination}`).toBeDefined();
      expect(destination?.pageArchitecture, alias.destination).toBe("canonical");
    }

    for (const route of SCE_DS2_07A_PREEXISTING_CANONICAL_DESTINATIONS) {
      const entry = SCE_DS2_06_ROUTE_INVENTORY.find((e) => e.route === route);
      expect(entry?.pageArchitecture, route).toBe("canonical");
      expect(entry?.tabsFinanceAligned, route).toBe(true);
    }
  });
});
