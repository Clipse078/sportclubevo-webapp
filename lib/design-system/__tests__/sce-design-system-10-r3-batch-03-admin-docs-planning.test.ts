import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10_GOVERNANCE,
  SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS,
} from "@/lib/design-system/sce-design-system-10-meta";
import {
  SCE_DESIGN_SYSTEM_10_R3_BATCH_03,
  SCE_DESIGN_SYSTEM_10_R3_PO_PUBLISHING_VISUAL_UAT,
} from "@/lib/design-system/sce-design-system-10-r3-meta";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10-R3 Batch 03 — Admin, Documents & Planning Administration", () => {
  it("records PO publishing visual UAT pass and R3 batch routes", () => {
    expect(SCE_DESIGN_SYSTEM_10_R3_PO_PUBLISHING_VISUAL_UAT.PO_DS10_PUBLISHING_VISUAL_UAT).toBe(
      "PASS",
    );
    expect(SCE_DESIGN_SYSTEM_10_R3_PO_PUBLISHING_VISUAL_UAT.CARD_SOUP).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10_R3_BATCH_03.ROUTES["/dashboard/workspace"]).toBe("MIGRATED_DS10_R3");
    expect(SCE_DESIGN_SYSTEM_10_R3_BATCH_03.ROUTES["/dashboard/logs"]).toBe("MIGRATED_DS10_R3");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("NO");
  });

  it("adopts SceWorkspaceChrome on Documents hub and governance sub-workspaces", () => {
    expect(readSrc("app/(admin)/dashboard/workspace/page.tsx")).toContain("SceWorkspaceChrome");
    expect(readSrc("app/(admin)/dashboard/workspace/page.tsx")).not.toContain("PageBreadcrumbs");
    expect(readSrc("app/(admin)/dashboard/workspace/audit/page.tsx")).toContain("SceWorkspaceChrome");
    expect(readSrc("app/(admin)/dashboard/workspace/governance/break-glass/page.tsx")).toContain(
      "SceWorkspaceChrome",
    );
  });

  it("migrates platform audit logs to canonical dense table — no legacy white shell", () => {
    expect(readSrc("app/(admin)/dashboard/logs/page.tsx")).toContain("SceWorkspaceChrome");
    const table = readSrc("components/admin/logs/AuditLogsTable.tsx");
    expect(table).toContain("SceDenseSurface");
    expect(table).toContain("SceDataTable");
    expect(table).not.toContain("bg-white");
    expect(table).not.toContain("bg-slate-50");
  });

  it("wraps day planner and planner create routes in workspace chrome", () => {
    expect(readSrc("app/(admin)/dashboard/planner/day/page.tsx")).toContain("SceWorkspaceChrome");
    expect(readSrc("app/(admin)/dashboard/planner/new/page.tsx")).toContain("SceWorkspaceChrome");
    expect(readSrc("components/admin/planner/DayPlannerPage.tsx")).not.toContain(
      "AdminSectionHeader",
    );
    expect(readSrc("components/admin/planner/DayPlannerPlanSelect.tsx")).not.toContain("bg-white");
  });

  it("migrates planner create form off legacy white card soup", () => {
    const form = readSrc("components/admin/planner/PlannerEntryCreateForm.tsx");
    expect(form).toContain("SceFeatureCard");
    expect(form).toContain("PlanningEditorOperationalWorkspace");
    expect(form).not.toContain("bg-white");
    expect(form).not.toContain("fca-heading");
    expect(form).not.toMatch(/type=["']checkbox["']/);
  });

  it("hardens facilities admin panel form controls without legacy white islands", () => {
    const panel = readSrc("components/admin/facilities/FacilitiesAdminPanel.tsx");
    expect(panel).not.toContain("bg-white");
    expect(panel).toContain("fca-input");
  });

  it("migrates next-season planner workspace", () => {
    expect(readSrc("app/(admin)/dashboard/seasons/planner/page.tsx")).toContain("SceWorkspaceChrome");
    expect(readSrc("components/admin/seasons/NextSeasonPlannerCard.tsx")).not.toContain("bg-white");
  });

  it("keeps unresolved product-wide debt truthful after R3", () => {
    expect(SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS.UNRESOLVED_MIGRATION_DEBT).toBeGreaterThan(0);
  });
});
