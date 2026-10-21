import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10_R4_CANONICAL_PRIMITIVES,
  SCE_DESIGN_SYSTEM_10_R4_WORKSPACE_LOCKS,
} from "@/lib/design-system/sce-design-system-10-r4-meta";
import { buildAufgabenWorkspaceTabNavigationConfig } from "@/lib/nav/aufgaben-workspace-tab-config";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10 R4 — Aufgaben workspace convergence", () => {
  it("locks single canonical workspace shell and context tabs", () => {
    expect(SCE_DESIGN_SYSTEM_10_R4_WORKSPACE_LOCKS.AUFGABEN_SINGLE_WORKSPACE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_R4_WORKSPACE_LOCKS.LOCAL_PARALLEL_PAGE_SHELLS_ALLOWED).toBe("NO");

    const shell = readSrc("components/admin/aufgaben/AufgabenWorkspaceShell.tsx");
    expect(shell).toContain("SceWorkspaceChrome");
    expect(shell).toContain("AufgabenWorkspaceContextTabs");
    expect(shell).toContain('data-testid="aufgaben-workspace-shell"');

    const page = readSrc("app/(admin)/dashboard/aufgaben/page.tsx");
    expect(page).toContain("AufgabenWorkspaceShell");
    expect(page).not.toContain("AufgabenScopeToggle");
    expect(page).not.toContain("PlanningManagementPageHeader");
  });

  it("preserves bereich deep links via SceContextTabs tabQueryParam", () => {
    const config = buildAufgabenWorkspaceTabNavigationConfig({
      showManagement: true,
      showRequirements: true,
    });
    expect(config.tabQueryParam).toBe("bereich");
    expect(config.tabRoutes?.meine).toContain("bereich=meine");
    expect(config.tabRoutes?.verwaltung).toContain("bereich=verwaltung");
    expect(config.tabRoutes?.anforderungen).toContain("bereich=anforderungen");

    expect(readSrc("components/admin/aufgaben/AufgabenWorkspaceContextTabs.tsx")).toContain(
      "SceContextTabs",
    );
  });

  it("keeps Meine Aufgaben local filters visually secondary", () => {
    const inbox = readSrc("components/admin/aufgaben/PersonalActionsInbox.tsx");
    expect(inbox).toContain("PersonalInboxFilterNav");
    expect(inbox).not.toContain('role="tablist"');
    expect(readSrc("components/admin/aufgaben/PersonalInboxFilterNav.tsx")).toContain(
      "data-personal-inbox-filter-tier=\"secondary\"",
    );
  });

  it("uses actionable error pattern for Anforderungen and Aufgabenverwaltung load failures", () => {
    expect(SCE_DESIGN_SYSTEM_10_R4_WORKSPACE_LOCKS.RAW_INLINE_ERROR_TEXT_AS_PRIMARY_ERROR_UI).toBe(
      "NO",
    );
    const requirements = readSrc("components/admin/aufgaben/RequirementsManagementWorkspace.tsx");
    expect(requirements).toContain("AufgabenDomainLoadError");
    expect(requirements).not.toMatch(/text-red-600/);
    expect(requirements).not.toContain("Anforderungen konnten nicht geladen werden.");

    const management = readSrc("components/admin/aufgaben/AufgabenManagementWorkspace.tsx");
    expect(management).toContain("AufgabenDomainLoadError");
    expect(management).not.toMatch(/text-red-600/);
  });

  it("does not introduce parallel PlanningManagementPageHeader shells in Aufgaben contexts", () => {
    expect(readSrc("components/admin/aufgaben/AufgabenManagementWorkspace.tsx")).not.toContain(
      "PlanningManagementPageHeader",
    );
    expect(readSrc("components/admin/aufgaben/RequirementsManagementWorkspace.tsx")).not.toContain(
      "PlanningManagementPageHeader",
    );
    expect(readSrc("components/admin/aufgaben/PersonalActionsInbox.tsx")).not.toContain(
      "PlanningManagementPageHeader",
    );
  });

  it("records canonical primitive map for guardrails", () => {
    expect(SCE_DESIGN_SYSTEM_10_R4_CANONICAL_PRIMITIVES.WORKSPACE_SHELL).toBe(
      "AufgabenWorkspaceShell",
    );
    expect(SCE_DESIGN_SYSTEM_10_R4_CANONICAL_PRIMITIVES.CONTEXT_TABS).toContain("SceContextTabs");
  });

  it("maintains Toggle First — no new binary checkboxes in R4 Aufgaben package", () => {
    expect(SCE_BINARY_CHECKBOX_COUNTS.REMAINING_LEGACY_BINARY_CHECKBOXES).toBe(0);
  });

  it("preserves task detail dialog accessibility primitives (DS-06/DS-09)", () => {
    const taskWorkspace = readSrc("components/admin/aufgaben/TaskWorkspace.tsx");
    expect(taskWorkspace).toContain("SceModalOverlay");
    expect(taskWorkspace).toContain("useSceModalDialog");
  });

  it("documents R4 in roadmap and debt inventory", () => {
    expect(readSrc("docs/roadmap/SCE-DESIGN-SYSTEM-10.md")).toContain("SCE-DESIGN-SYSTEM-10-R4");
    expect(readSrc("docs/design/SCE-DESIGN-SYSTEM-10-PRODUCT-WIDE-MIGRATION-MATRIX.md")).toMatch(
      /Aufgaben|aufgaben/,
    );
  });
});
