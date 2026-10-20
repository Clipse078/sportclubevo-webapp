import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_02_DOC_MARKERS,
  SCE_DESIGN_SYSTEM_02_PACKAGE_KEY,
  SCE_DESIGN_SYSTEM_02_REPRESENTATIVE_PRIMITIVES,
} from "@/lib/design-system/sce-design-system-02-meta";
import {
  SCE_FOUNDATION_ACTIVITY_PILL_VARIANTS,
  SCE_FOUNDATION_ALL_SEMANTIC_COLOR_VARS,
  SCE_FOUNDATION_DENSITY_TIERS,
  SCE_FOUNDATION_NAVIGATION_ROLLOUT,
  SCE_FOUNDATION_SOURCE_OF_TRUTH,
} from "@/lib/design-system/sce-foundation-contract";
import {
  SCE_Z_INDEX_COMPOSER_POPOVER,
  SCE_Z_INDEX_MODAL_OVERLAY,
} from "@/lib/ui/sce-overlay-layering";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readGlobalsCss(): string {
  return readDoc("app/globals.css");
}

describe("SCE-DESIGN-SYSTEM-02 foundations guardrails", () => {
  it("declares app/globals.css as the single foundation source of truth", () => {
    expect(SCE_FOUNDATION_SOURCE_OF_TRUTH).toBe("app/globals.css");
    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(master).toContain("app/globals.css");
    expect(master).toContain(SCE_DESIGN_SYSTEM_02_PACKAGE_KEY);
  });

  it("requires DS-02 roadmap and documents migration boundary", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-02.md");
    for (const marker of SCE_DESIGN_SYSTEM_02_DOC_MARKERS) {
      expect(roadmap).toContain(marker);
    }
    expect(roadmap).toContain("Representative adoption only");
  });

  it("defines canonical semantic colour token families in globals.css", () => {
    const css = readGlobalsCss();
    for (const token of SCE_FOUNDATION_ALL_SEMANTIC_COLOR_VARS) {
      expect(css).toContain(`${token}:`);
    }
    expect(css).toContain("--sce-density-comfortable-control-height");
    expect(css).toContain("--sce-focus-ring-color");
    expect(css).toContain(".sce-type-page-title");
  });

  it("does not introduce a competing parallel token CSS file", () => {
    const css = readGlobalsCss();
    expect(css).toContain("DS-02 semantic colour foundation");
    // Guard: no second :root token dump file in lib/design-system
    expect(() => readDoc("lib/design-system/tokens.css")).toThrow();
  });

  it("preserves activity semantic pill variants and CSS aliases", () => {
    expect(SCE_FOUNDATION_ACTIVITY_PILL_VARIANTS).toEqual([
      "match-red",
      "training-blue",
      "tournament-orange",
      "club-event-violet",
    ]);
    const css = readGlobalsCss();
    expect(css).toContain("--sce-activity-match:");
    expect(css).toContain("--sce-activity-training:");
    expect(css).toContain("--sce-activity-tournament:");
    expect(css).toContain("--sce-activity-club-event:");
  });

  it("documents density foundation tiers", () => {
    expect(SCE_FOUNDATION_DENSITY_TIERS).toEqual([
      "COMFORTABLE",
      "COMPACT",
      "DENSE",
    ]);
  });

  it("keeps overlay layering canonical", () => {
    const css = readGlobalsCss();
    expect(SCE_Z_INDEX_MODAL_OVERLAY).toBe(100);
    expect(SCE_Z_INDEX_COMPOSER_POPOVER).toBe(105);
    expect(css).toContain("--sce-z-modal-overlay: 100");
    expect(css).toContain("--sce-z-composer-popover: 105");
  });

  it("points breadcrumb and context tab rollout to DS-03", () => {
    expect(SCE_FOUNDATION_NAVIGATION_ROLLOUT.breadcrumbRolloutOwner).toBe(
      "SCE-DESIGN-SYSTEM-03",
    );
    expect(SCE_FOUNDATION_NAVIGATION_ROLLOUT.contextTabRolloutOwner).toBe(
      "SCE-DESIGN-SYSTEM-03",
    );
    expect(SCE_FOUNDATION_NAVIGATION_ROLLOUT.contextTabsCanonical).toBe(
      "SceContextTabs",
    );
    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(master).toContain("Toggle First");
    expect(master).toContain("SceContextTabs");
  });

  it("preserves Communication visual reference markers", () => {
    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(master).toContain("COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE");
    expect(master).toContain("/dashboard/communication");
  });

  it("uses SCE activity card family terminology (not World Activity Card architecture)", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-02.md");
    expect(roadmap).not.toMatch(/World Activity Card/i);
    expect(roadmap).toContain("SceMatchCard");
  });

  it("lists representative primitive adoption targets", () => {
    expect(SCE_DESIGN_SYSTEM_02_REPRESENTATIVE_PRIMITIVES).toContain("Button");
    expect(SCE_DESIGN_SYSTEM_02_REPRESENTATIVE_PRIMITIVES).toContain(
      "SceContextTabs",
    );
  });
});
