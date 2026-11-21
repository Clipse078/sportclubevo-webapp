import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectVereinsentwicklungCopyViolations,
  collectVereinsentwicklungWorkspaceViolations,
  SCE_VEREINSENTWICKLUNG_VISUAL_SURFACE_MARKERS,
} from "../sce-vereinsentwicklung-visual-governance";
import { runSceDesignSystemGovernance } from "@/lib/design-system/sce-design-system-governance-runner";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("SCE Vereinsentwicklung visual standard (ClubDevelopmentOverview reference)", () => {
  it("exports shared surface primitives used by migrated workspaces", () => {
    expect(read("components/admin/club-development/SceClubDevelopmentSectionShell.tsx")).toContain(
      SCE_VEREINSENTWICKLUNG_VISUAL_SURFACE_MARKERS.sectionShell,
    );
    expect(read("components/admin/club-development/ClubDevelopmentOverview.tsx")).toContain(
      SCE_VEREINSENTWICKLUNG_VISUAL_SURFACE_MARKERS.sectionShell,
    );
    expect(read("components/admin/club-development/VereinsentwicklungUebersichtRecordSections.tsx")).toContain(
      "VereinsentwicklungWorkspaceRecordRow",
    );
    expect(read("components/admin/club-development/sce-club-development-surface-styles.ts")).toContain(
      "SCE_CD_OVERVIEW_UNIFIED_GRID",
    );
    const overviewGrid = read("components/admin/club-development/sce-club-development-surface-styles.ts");
    const overviewGridLine = overviewGrid
      .split("\n")
      .find((line) => line.includes("SCE_CD_OVERVIEW_UNIFIED_GRID") || line.includes("grid-cols-[8.5rem"));
    expect(overviewGrid).toContain("SCE_CD_OVERVIEW_UNIFIED_GRID");
    expect(overviewGridLine ?? "").not.toContain("max-content");
    expect(read("components/admin/club-development/VorhabenAufgabenWorkspace.tsx")).toContain(
      SCE_VEREINSENTWICKLUNG_VISUAL_SURFACE_MARKERS.surfaceStyles,
    );
    expect(read("components/admin/club-development/StrategienWorkspaceListPanel.tsx")).toContain(
      "VereinsentwicklungWorkspaceToolbar",
    );
    expect(read("components/admin/club-development/ZieleWorkspacePanel.tsx")).toContain(
      "VereinsentwicklungWorkspaceToolbar",
    );
    expect(read("components/admin/club-development/UmsetzungsplanungWorkspace.tsx")).toContain(
      "VereinsentwicklungWorkspaceToolbar",
    );
    expect(read("components/admin/club-development/VorhabenAufgabenWorkspace.tsx")).toContain(
      "aufgaben-workspace-toolbar",
    );
  });

  it("uses single Vorhaben & Umsetzung page subtitle without duplicate workspace intro", () => {
    const page = read("app/(admin)/vereinsleitung/vorhaben-und-umsetzung/page.tsx");
    const workspace = read("components/admin/club-development/VorhabenAufgabenWorkspace.tsx");
    expect(page).toContain("pageMeta.description");
    expect(read("lib/club-development/product-copy.ts")).toContain(
      "CD_CONNECTED_WORKSPACE_VIEW_COPY",
    );
    expect(workspace).not.toContain("NavShortcut");
    expect(workspace).not.toContain("CD_VORHABEN_WORKSPACE_COPY.intro");
    expect(read("components/admin/club-development/VorhabenUndUmsetzungWorkspaceClient.tsx")).toContain(
      'variant="vorhaben"',
    );
    expect(read("components/admin/club-development/VorhabenWorkspaceToolbar.tsx")).toContain(
      "VorhabenPrioritaetenControl",
    );
  });

  it("keeps implementation language off user-facing Vereinsentwicklung copy paths", () => {
    for (const rel of [
      "lib/club-development/product-copy.ts",
      "components/admin/club-development/ClubDevelopmentOverview.tsx",
      "components/admin/vereinsleitung/GovernanceStaleCard.tsx",
    ]) {
      const findings = collectVereinsentwicklungCopyViolations(rel, read(rel));
      expect(findings, findings.map((f) => f.reason).join("; ")).toHaveLength(0);
    }
  });

  it("passes design-system governance on Vereinsentwicklung workspace paths", () => {
    const result = runSceDesignSystemGovernance({
      files: [
        "lib/club-development/product-copy.ts",
        "components/admin/club-development/ClubDevelopmentOverview.tsx",
        "components/admin/club-development/VorhabenAufgabenWorkspace.tsx",
        "components/admin/club-development/VorhabenUndUmsetzungWorkspaceClient.tsx",
        "app/(admin)/vereinsleitung/vorhaben-und-umsetzung/page.tsx",
        "components/admin/club-development/StrategyAuthoringPanel.tsx",
        "components/admin/club-development/ZieleWorkspacePanel.tsx",
        "app/(admin)/vereinsleitung/meetings/page.tsx",
        "components/admin/vereinsleitung/VereinsleitungMeetingsWorkspaceClient.tsx",
        "components/admin/meetings/workspace/MeetingWorkspace.tsx",
        "components/admin/club-development/UmsetzungsplanungWorkspace.tsx",
        "components/admin/club-development/UmsetzungsplanungPhaseAssignedTasksPanel.tsx",
        "components/admin/club-development/UmsetzungsplanungUnplannedPanel.tsx",
      ],
    });
    expect(
      result.violations.filter((v) => v.ruleId === "SCE-DS-GOV-CD-VISUAL-001"),
    ).toHaveLength(0);
  });

  it("detects workspace regressions (fixture expectations)", () => {
    const bad = collectVereinsentwicklungWorkspaceViolations(
      "components/admin/club-development/VorhabenAufgabenWorkspace.tsx",
      "function NavShortcut() {}",
    );
    expect(bad.some((f) => f.reason.includes("shortcut cards"))).toBe(true);
  });
});