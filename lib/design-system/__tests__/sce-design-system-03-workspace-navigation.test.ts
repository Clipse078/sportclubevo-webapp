import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_03_CANONICAL_PRIMITIVES,
  SCE_DESIGN_SYSTEM_03_DOC_MARKERS,
  SCE_DESIGN_SYSTEM_03_LEGACY_NAV_INVENTORY,
  SCE_DESIGN_SYSTEM_03_PACKAGE_KEY,
  SCE_DESIGN_SYSTEM_03_PO_FLAGS,
  SCE_DESIGN_SYSTEM_03_WORKSPACE_AUDIT,
} from "@/lib/design-system/sce-design-system-03-meta";
import {
  SCE_WORKSPACE_CANONICAL_PRIMITIVES,
  SCE_WORKSPACE_HIERARCHY_LAYERS,
  SCE_WORKSPACE_PRODUCT_WIDE_FLAGS,
} from "@/lib/design-system/sce-workspace-hierarchy";
import {
  buildRolesAdminTabNavigationConfig,
  resolveRolesAdminTabFromPathname,
} from "@/lib/roles/roles-admin-tab-config";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-03 workspace / navigation guardrails", () => {
  it("documents DS-03 roadmap and master design system section", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-03.md");
    expect(roadmap).toContain(SCE_DESIGN_SYSTEM_03_PACKAGE_KEY);
    expect(roadmap).toContain("WORKSPACE_SYSTEM_PRODUCT_WIDE");

    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    for (const marker of SCE_DESIGN_SYSTEM_03_DOC_MARKERS.slice(0, 6)) {
      expect(master).toContain(marker);
    }
  });

  it("requires migration inventory artifact", () => {
    const inventory = readDoc(
      "docs/design/SCE-DESIGN-SYSTEM-03-MIGRATION-INVENTORY.md",
    );
    expect(inventory).toContain("LEGACY_MIGRATION_INVENTORY");
    expect(inventory).toContain("SceBreadcrumbs");
    expect(inventory).toContain("SceContextTabs");
  });

  it("locks product-wide workspace flags", () => {
    expect(SCE_WORKSPACE_PRODUCT_WIDE_FLAGS.WORKSPACE_SYSTEM_PRODUCT_WIDE).toBe(
      "YES",
    );
    expect(SCE_WORKSPACE_PRODUCT_WIDE_FLAGS.LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED).toBe(
      "NO",
    );
    expect(SCE_DESIGN_SYSTEM_03_PO_FLAGS.ACTIVITY_TAB_ARROW_KEY_ACCESSIBILITY).toBe(
      "IMPLEMENTED",
    );
  });

  it("defines canonical hierarchy primitives without parallel tab framework files", () => {
    expect(SCE_WORKSPACE_HIERARCHY_LAYERS).toEqual([
      "GLOBAL_NAVIGATION",
      "BREADCRUMBS",
      "WORKSPACE_HEADER",
      "CONTEXT_TABS",
      "WORKSPACE_CONTENT",
    ]);
    expect(SCE_WORKSPACE_CANONICAL_PRIMITIVES.CONTEXT_TABS).toBe("SceContextTabs");
    expect(SCE_WORKSPACE_CANONICAL_PRIMITIVES.BREADCRUMBS).toBe("SceBreadcrumbs");

    const rolesTabs = readSrc("components/admin/roles/RolesAdminTabs.tsx");
    expect(rolesTabs).toContain("SceContextTabs");
    expect(rolesTabs).not.toMatch(/role=\"tablist\"[\s\S]*className=\"flex gap-1 border-b/);
  });

  it("PageBreadcrumbs delegates to SceBreadcrumbs", () => {
    const pageBc = readSrc("components/ui/page/PageBreadcrumbs.tsx");
    expect(pageBc).toContain("SceBreadcrumbs");
  });

  it("Person workspace uses SceContextTabs canonical shell", () => {
    const personTabs = readSrc("components/admin/persons/PersonDetailTabs.tsx");
    expect(personTabs).toContain("SceContextTabs");
    expect(personTabs).not.toContain('role="tablist"');
  });

  it("SceContextTabs implements arrow-key tablist behaviour", () => {
    const tabs = readSrc("components/sce/context-tabs/SceContextTabs.tsx");
    expect(tabs).toContain("ArrowRight");
    expect(tabs).toContain("ArrowLeft");
    expect(tabs).toContain("activateTabAtIndex");
  });

  it("Communication remains primary visual reference without universal template claim", () => {
    const commHeader = readSrc(
      "components/admin/communication/shared/CommunicationWorkspaceHeader.tsx",
    );
    expect(commHeader).toContain("SceWorkspaceHeader");
    expect(commHeader).toContain("SceBreadcrumbs");

    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(master).toContain("COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE");
    expect(master).toContain("not");
  });

  it("prohibits World Activity Card architecture term in DS-03 docs", () => {
    const inventory = readDoc(
      "docs/design/SCE-DESIGN-SYSTEM-03-MIGRATION-INVENTORY.md",
    );
    expect(inventory).not.toMatch(/World Activity Card/i);
  });

  it("audits all required product areas", () => {
    expect(SCE_DESIGN_SYSTEM_03_WORKSPACE_AUDIT.length).toBeGreaterThanOrEqual(20);
    const areas = new Set(SCE_DESIGN_SYSTEM_03_WORKSPACE_AUDIT.map((e) => e.area));
    expect(areas.has("Communication")).toBe(true);
    expect(areas.has("Personen & Zugänge")).toBe(true);
    expect(areas.has("Wochenplaner")).toBe(true);
  });

  it("route-based roles admin tabs preserve URL ownership", () => {
    const config = buildRolesAdminTabNavigationConfig();
    expect(config.tabRoutes?.assignments).toContain("/assignments");
    expect(resolveRolesAdminTabFromPathname("/dashboard/administration/roles/assignments")).toBe(
      "assignments",
    );
    expect(resolveRolesAdminTabFromPathname("/dashboard/administration/roles/abc/edit")).toBe(
      "roles",
    );
  });

  it("legacy inventory rows resolve billing and admin headers after DS-10", () => {
    const billing = SCE_DESIGN_SYSTEM_03_LEGACY_NAV_INVENTORY.find(
      (row) => row.currentImplementation === "BillingWorkspaceNav",
    );
    const adminHeader = SCE_DESIGN_SYSTEM_03_LEGACY_NAV_INVENTORY.find(
      (row) => row.currentImplementation === "AdminSectionHeader",
    );
    expect(billing?.status).not.toBe("DS10_REMAINING");
    expect(adminHeader?.status).not.toBe("DS10_REMAINING");
    expect(SCE_DESIGN_SYSTEM_03_CANONICAL_PRIMITIVES.BREADCRUMBS).toBe(
      "SceBreadcrumbs",
    );
  });
});
