import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { providerMappingEditHref } from "@/components/admin/teams/provider-mapping/ProviderMappingWorkspace";
import {
  SCE_DESIGN_SYSTEM_10_GOVERNANCE,
  SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS,
  SCE_DESIGN_SYSTEM_10_PO_REVIEW,
  SCE_DESIGN_SYSTEM_10_R1_BATCH_01_PO_VISUAL_UAT,
} from "@/lib/design-system/sce-design-system-10-meta";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10-R1 Batch 01 — Club / Organisation core", () => {
  it("records PO visual UAT in progress — migration not complete", () => {
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10_PO_REVIEW.DS10_STATUS).toBe("PO_VISUAL_UAT_IN_PROGRESS");
    expect(SCE_DESIGN_SYSTEM_10_R1_BATCH_01_PO_VISUAL_UAT.DS10_PO_VISUAL_UAT).toBe("IN_PROGRESS");
    expect(SCE_DESIGN_SYSTEM_10_R1_BATCH_01_PO_VISUAL_UAT.DS10_R1_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_10_MIGRATION_MATRIX_COUNTS.UNRESOLVED_MIGRATION_DEBT).toBe(4);
  });

  it("locks legacy white islands out of dark workspace", () => {
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.LEGACY_WHITE_APPLICATION_SURFACES_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.RAW_WHITE_DATA_TABLE_IN_DARK_WORKSPACE_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_10_GOVERNANCE.CANONICAL_DARK_LAYERING_REQUIRED).toBe("YES");
  });

  it("uses canonical dense provider-mapping architecture — no legacy light table", () => {
    const workspace = readSrc("components/admin/teams/provider-mapping/ProviderMappingWorkspace.tsx");
    expect(workspace).toContain("SceDenseSurface");
    expect(workspace).toContain("SceDataTable");
    expect(workspace).not.toContain("bg-white");
    expect(workspace).not.toContain("bg-gray-50");
    expect(readSrc("app/(admin)/dashboard/teams/provider-mapping/page.tsx")).toContain(
      "SceActionLink",
    );
  });

  it("preserves provider-mapping edit href contract (STAGE-OPS-02)", () => {
    const mapped = {
      id: "m1",
      teamSeasonId: "ts1",
    } as Parameters<typeof providerMappingEditHref>[0];
    const unmapped = { id: "m2", teamSeasonId: null } as Parameters<typeof providerMappingEditHref>[0];
    expect(providerMappingEditHref(mapped)).toBe(
      "/dashboard/teams/provider-mapping/ts1?mappingId=m1",
    );
    expect(providerMappingEditHref(unmapped)).toBe(
      "/dashboard/teams/provider-mapping/mapping/m2",
    );
  });

  it("composes competitions operational toolbar with canonical toggle — no KPI hero", () => {
    const page = readSrc("app/(admin)/dashboard/competitions/page.tsx");
    expect(page).not.toContain("Aktive Wettkämpfe");
    expect(page).toContain("CompetitionsListWorkspace");

    const toolbar = readSrc("components/admin/competitions/CompetitionsOperationalToolbar.tsx");
    expect(toolbar).toContain("SceDenseToolbar");
    expect(toolbar).toContain("SwitchToggle");
    expect(toolbar).not.toContain('type="checkbox"');

    const table = readSrc("components/admin/competitions/CompetitionsTable.tsx");
    expect(table).toContain("SceDataTable");
    expect(table).not.toContain("bg-white");

    const sync = readSrc("components/admin/competitions/CompetitionsSyncButton.tsx");
    expect(sync).not.toContain("bg-blue-600");
    expect(sync).toContain('variant="secondary"');
  });

  it("reduces redundant season label in compact teams selector", () => {
    const selector = readSrc("components/admin/shared/SeasonContextSelector.tsx");
    expect(selector).toContain("data-variant={variant}");
    expect(selector).not.toContain("mt-0.5 truncate text-sm font-semibold");
  });
});
