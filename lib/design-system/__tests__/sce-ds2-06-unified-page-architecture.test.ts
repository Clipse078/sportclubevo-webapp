/**
 * SCE-DS2-06 — unified page architecture (Finance reference)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DS2_06_DOC_MARKERS,
  SCE_DS2_06_MANDATORY_ROUTES,
  SCE_DS2_06_PACKAGE_KEY,
  SCE_DS2_06_PAGE_PRIMITIVES,
} from "@/lib/design-system/sce-ds2-06-meta";
import { SCE_DS2_06_MODAL_MIGRATION_INVENTORY } from "@/lib/design-system/sce-ds2-06-modal-migration-inventory";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const MANDATORY_PAGE_FILES: Record<(typeof SCE_DS2_06_MANDATORY_ROUTES)[number], string> = {
  "/dashboard": "app/(admin)/dashboard/(personal-dashboard)/page.tsx",
  "/dashboard/org-units": "app/(admin)/dashboard/org-units/page.tsx",
  "/dashboard/teams": "app/(admin)/dashboard/teams/page.tsx",
  "/dashboard/vereine": "app/(admin)/dashboard/vereine/page.tsx",
  "/dashboard/persons": "app/(admin)/dashboard/persons/page.tsx",
  "/dashboard/competitions": "app/(admin)/dashboard/competitions/page.tsx",
  "/dashboard/planner/week": "app/(admin)/dashboard/planner/week/page.tsx",
  "/dashboard/finance": "app/(admin)/dashboard/finance/page.tsx",
};

function usesUnifiedPageShell(source: string): boolean {
  return (
    source.includes("SceWorkspaceChrome") ||
    source.includes("ListPagePattern") ||
    source.includes("DetailPagePattern")
  );
}

describe("SCE-DS2-06 unified page architecture", () => {
  it("documents the package and delivery note", () => {
    expect(readRepo("docs/design-system-v2/18-ds2-06-unified-page-architecture-delivery.md")).toContain(
      SCE_DS2_06_PACKAGE_KEY,
    );
    const sources = [
      readRepo("components/sce/page/index.ts"),
      readRepo("lib/design-system/sce-ds2-06-meta.ts"),
      readRepo("components/ui/patterns/ListPagePattern.tsx"),
    ].join("\n");
    for (const marker of SCE_DS2_06_DOC_MARKERS) {
      if (marker.startsWith("docs/")) continue;
      expect(sources).toContain(marker);
    }
    expect(SCE_DS2_06_PAGE_PRIMITIVES.length).toBe(7);
  });

  it("covers mandatory routes with Finance-aligned workspace chrome", () => {
    for (const route of SCE_DS2_06_MANDATORY_ROUTES) {
      if (route === "/dashboard/planner/week") {
        expect(readRepo(MANDATORY_PAGE_FILES[route])).toContain("PageShell");
        expect(readRepo("components/admin/planning/PlanningManagementPageHeader.tsx")).toContain(
          "SceWorkspaceChrome",
        );
        continue;
      }
      const file = MANDATORY_PAGE_FILES[route];
      const source = readRepo(file);
      expect(usesUnifiedPageShell(source), `missing unified shell on ${route}`).toBe(true);
    }
  });

  it("list and detail patterns compose SceWorkspaceChrome", () => {
    expect(readRepo("components/ui/patterns/ListPagePattern.tsx")).toContain("SceWorkspaceChrome");
    expect(readRepo("components/ui/patterns/DetailPagePattern.tsx")).toContain("SceWorkspaceChrome");
  });

  it("uses a light organigram canvas (no hardcoded dark viewport)", () => {
    const canvas = readRepo("components/admin/org/OrgUnitCanvasView.tsx");
    expect(canvas).not.toContain("#0c1220");
    expect(canvas).toContain("--sce-color-surface-muted");
  });

  it("prevents stacked match team names from breaking letter-by-letter", () => {
    const stacked = readRepo("components/sporting-activity/SceMatchStackedFixtureIdentity.tsx");
    expect(stacked).toContain("break-words");
    expect(stacked).toContain("[overflow-wrap:anywhere]");
  });

  it("migrates Wochenplaner planning editor to contextual side panel", () => {
    const shell = readRepo("components/admin/planner/WeekplannerActivityEditorShell.tsx");
    expect(shell).toContain("contextualPanel");
    const css = readRepo("app/globals.css");
    expect(css).toContain("data-sce-contextual-side-panel");
  });

  it("records modal migration inventory", () => {
    expect(SCE_DS2_06_MODAL_MIGRATION_INVENTORY.length).toBeGreaterThanOrEqual(5);
    const wochen = SCE_DS2_06_MODAL_MIGRATION_INVENTORY.find((e) => e.id === "wochenplaner-canonical-edit");
    expect(wochen?.classification).toBe("contextual-side-panel");
  });
});
