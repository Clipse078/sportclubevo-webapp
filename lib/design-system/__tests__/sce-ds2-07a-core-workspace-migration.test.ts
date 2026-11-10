/**
 * SCE-DS2-07A — core workspace migration governance
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_07A_MIGRATED_ROUTES,
  SCE_DS2_07A_PACKAGE_KEY,
} from "@/lib/design-system/sce-ds2-07a-meta";
import { SCE_DS2_06_ROUTE_INVENTORY } from "@/lib/design-system/sce-ds2-06-route-inventory";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DS2-07A core workspace migration", () => {
  it("documents delivery and migrated route batch", () => {
    const doc = readRepo("docs/design-system-v2/20-ds2-07a-core-workspace-migration-delivery.md");
    expect(doc).toContain(SCE_DS2_07A_PACKAGE_KEY);
    expect(SCE_DS2_07A_MIGRATED_ROUTES).toHaveLength(5);
  });

  it("composes FormPagePattern with SceWorkspaceChrome", () => {
    const pattern = readRepo("components/ui/patterns/FormPagePattern.tsx");
    expect(pattern).toContain("SceWorkspaceChrome");
    expect(pattern).not.toContain("PageBreadcrumbs");
  });

  it("preserves finance income_statement redirect alias", () => {
    const page = readRepo("app/(admin)/dashboard/finance/income_statement/page.tsx");
    expect(page).toContain('redirect("/dashboard/finance/reports")');
    const layout = readRepo("app/(admin)/dashboard/finance/income_statement/layout.tsx");
    expect(layout).toContain("SceWorkspaceChrome");
  });

  it("preserves teams/new redirect to registration wizard", () => {
    const page = readRepo("app/(admin)/dashboard/teams/new/page.tsx");
    expect(page).toContain('redirect("/dashboard/teams/register")');
    const layout = readRepo("app/(admin)/dashboard/teams/new/layout.tsx");
    expect(layout).toContain("SceWorkspaceChrome");
  });

  it("keeps vereine/new composer fallback without FormPagePattern on page", () => {
    const page = readRepo("app/(admin)/dashboard/vereine/new/page.tsx");
    expect(page).toContain('layout="composer"');
    expect(page).not.toMatch(/\bFormPagePattern\b/);
    expect(page).toContain("SceWorkspaceChrome");
  });

  it("marks migrated routes canonical in regenerated inventory", () => {
    for (const route of SCE_DS2_07A_MIGRATED_ROUTES) {
      const entry = SCE_DS2_06_ROUTE_INVENTORY.find((e) => e.route === route);
      expect(entry, `missing inventory row for ${route}`).toBeDefined();
      expect(entry?.pageArchitecture, route).toBe("canonical");
      expect(entry?.headerFinanceAligned, route).toBe(true);
    }
  });
});
