import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_10_GOVERNANCE,
  SCE_DESIGN_SYSTEM_10_R1_BATCH_02_PO_VISUAL_UAT,
} from "@/lib/design-system/sce-design-system-10-meta";
import { buildTrainingOperationalSummaryItems } from "@/lib/training/training-operational-summary";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10-R1 Batch 02 — Planning & activity operations", () => {
  it("records Batch 02 PO baseline — not accepted, migration incomplete", () => {
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10_R1_BATCH_02_PO_VISUAL_UAT.DS10_PO_VISUAL_UAT).toBe("IN_PROGRESS");
    expect(SCE_DESIGN_SYSTEM_10_R1_BATCH_02_PO_VISUAL_UAT.ROUTES["/dashboard/matchcenter"]).toBe(
      "R1_REQUIRED",
    );
    for (const status of Object.values(SCE_DESIGN_SYSTEM_10_R1_BATCH_02_PO_VISUAL_UAT.ROUTES)) {
      expect(status).toBe("R1_REQUIRED");
    }
  });

  it("governs training KPIs — no duplicate total/active hero strip", () => {
    const items = buildTrainingOperationalSummaryItems(
      { active: 56, inactive: 0, archived: 0, total: 56 },
      { archiveToggleHref: "/dashboard/training?archived=1", archivedView: false },
    );
    expect(items.map((i) => i.key)).toEqual(["active"]);
    expect(items.find((i) => i.key === "total")).toBeUndefined();
  });

  it("preserves planner primary view modes and command surface", () => {
    const chrome = readSrc("components/admin/planner/WeekPlannerChrome.tsx");
    expect(chrome).toContain("planning-hub-command-surface");
    expect(chrome).toContain("planning-hub-perspective-liste");
    expect(chrome).toContain("planning-hub-perspective-spielfeld");
    expect(chrome).toContain("planning-hub-perspective-garderobe");
    expect(chrome).toContain("planning-hub-perspective-kalender");
  });

  it("keeps programme canonical list — compact collapsible filters", () => {
    const filters = readSrc("components/programme/ClubProgrammeFilterBar.tsx");
    expect(filters).toContain('data-testid="club-programme-filters"');
    expect(filters).toContain("<details");
    expect(readSrc("components/programme/ProgrammeListeView.tsx")).toContain(
      "ProgrammeSceActivityCard",
    );
  });

  it("preserves match home/away grammar and status multi-select checkboxes", () => {
    const row = readSrc("components/admin/matchcenter/SpieleManagementMatchRow.tsx");
    expect(row).toMatch(/home|away|VS/i);
    const filterRail = readSrc("components/admin/matchcenter/SpieleManagementFilterRail.tsx");
    expect(filterRail).toContain("spiele-status-toggle-");
    expect(filterRail).not.toContain('type="checkbox"');
    const workspace = readSrc("components/admin/matchcenter/SpieleManagementWorkspace.tsx");
    expect(workspace).toContain("SpieleManagementStatusStrip");
    expect(workspace).not.toContain("SpieleManagementQuickAccess");
  });

  it("avoids legacy white application surfaces on touched workspaces", () => {
    for (const path of [
      "components/admin/training/TrainingManagementWorkspace.tsx",
      "components/admin/matchcenter/SpieleManagementWorkspace.tsx",
      "components/admin/tournamentcenter/TournamentCenterWorkspace.tsx",
      "components/admin/veranstaltungen/VeranstaltungenManagementWorkspace.tsx",
    ]) {
      const src = readSrc(path);
      expect(src).not.toContain("bg-white");
      expect(src).not.toContain("bg-gray-50");
    }
  });

  it("does not introduce new binary setting checkboxes on Batch 02 surfaces", () => {
    for (const path of [
      "components/programme/ClubProgrammeFilterBar.tsx",
      "components/admin/matchcenter/SpieleManagementFilterRail.tsx",
    ]) {
      expect(readSrc(path)).not.toMatch(/type=["']checkbox["']/);
    }
  });
});
