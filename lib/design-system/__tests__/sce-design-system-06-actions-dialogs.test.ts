import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_06_ACTION_DIALOG_AUDIT,
  SCE_DESIGN_SYSTEM_06_CANONICAL_ACTION_DIALOG_PRIMITIVES,
  SCE_DESIGN_SYSTEM_06_DOC_MARKERS,
  SCE_DESIGN_SYSTEM_06_GOVERNANCE,
  SCE_DESIGN_SYSTEM_06_LEGACY_ACTION_DIALOG_INVENTORY,
  SCE_DESIGN_SYSTEM_06_NESTED_DIALOG_COUNTS,
  SCE_DESIGN_SYSTEM_06_PACKAGE_KEY,
  SCE_DESIGN_SYSTEM_06_PO_FLAGS,
  SCE_DESIGN_SYSTEM_06_PO_REVIEW,
  SCE_DESIGN_SYSTEM_06_REPRESENTATIVE_ADOPTION,
  SCE_DESIGN_SYSTEM_06_WORLD_CLASS_MICRO_UX,
} from "@/lib/design-system/sce-design-system-06-meta";
import {
  SCE_ACTION_HIERARCHY_LEVELS,
  SCE_COMPOSER_ARCHITECTURE_FLAGS,
  SCE_DIALOG_ARCHITECTURE,
  SCE_NESTED_DIALOG_POLICY,
} from "@/lib/design-system/sce-action-dialog-foundation";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-06 actions, dialogs & composer guardrails", () => {
  it("documents DS-06 roadmap, inventory, and master design system section", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-06.md");
    expect(roadmap).toContain(SCE_DESIGN_SYSTEM_06_PACKAGE_KEY);
    expect(roadmap).toContain("ACTION_SYSTEM_PRODUCT_WIDE");

    const inventory = readDoc("docs/design/SCE-DESIGN-SYSTEM-06-ACTION-DIALOG-INVENTORY.md");
    expect(inventory).toContain("ACTION_DIALOG_MIGRATION_INVENTORY");

    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    for (const marker of SCE_DESIGN_SYSTEM_06_DOC_MARKERS.slice(0, 8)) {
      expect(master).toContain(marker);
    }
  });

  it("locks action/dialog system governance and baseline STAGE", () => {
    expect(SCE_DESIGN_SYSTEM_06_PO_FLAGS.ACTION_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_PO_FLAGS.DIALOG_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_PO_FLAGS.ACTIVITY_COMPOSER_CANONICAL).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_PO_REVIEW.BASELINE_STAGE_HEAD).toBe(
      "896d51e70586e28a78511cdea3f621b826483366",
    );
    expect(SCE_DESIGN_SYSTEM_06_GOVERNANCE.PARALLEL_PATTERN_INTRODUCED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_06_GOVERNANCE.PARALLEL_MODAL_SYSTEM).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_06_GOVERNANCE.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_06_GOVERNANCE.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
  });

  it("defines canonical action hierarchy and dialog architecture without a second modal stack", () => {
    expect(SCE_ACTION_HIERARCHY_LEVELS).toContain("PRIMARY");
    expect(SCE_ACTION_HIERARCHY_LEVELS).toContain("DESTRUCTIVE");
    expect(SCE_ACTION_HIERARCHY_LEVELS).toContain("ICON_ACTION");
    expect(SCE_DIALOG_ARCHITECTURE.OVERLAY).toBe("SceModalOverlay");
    expect(SCE_DIALOG_ARCHITECTURE.PARALLEL_MODAL_SYSTEM_ALLOWED).toBe("NO");
    expect(SCE_NESTED_DIALOG_POLICY.AVOID_MODAL_OVER_MODAL).toBe("YES");

    expect(SCE_DESIGN_SYSTEM_06_CANONICAL_ACTION_DIALOG_PRIMITIVES.BUTTON).toBe("Button");
    expect(SCE_DESIGN_SYSTEM_06_CANONICAL_ACTION_DIALOG_PRIMITIVES.CONFIRMATION).toBe(
      "SceConfirmDialog",
    );
    expect(SCE_DESIGN_SYSTEM_06_CANONICAL_ACTION_DIALOG_PRIMITIVES.COMPOSER).toBe(
      "SceActivityComposer",
    );
  });

  it("requires canonical primitives in source — no parallel modal/dialog framework", () => {
    expect(readSrc("components/sce/actions/SceConfirmDialog.tsx")).toContain("SceConfirmDialog");
    expect(readSrc("components/ui/Dialog.tsx")).toContain("SceModalOverlay");
    expect(readSrc("components/ui/Dialog.tsx")).toContain("data-sce-dialog-shell");
    expect(readSrc("components/sce/activity-composer/SceActivityComposer.tsx")).toContain(
      "SceContextDirtyGuardProvider",
    );
    const repoRoot = readSrc("lib/design-system/sce-design-system-06-meta.ts");
    expect(repoRoot).not.toMatch(/SceModal2|ModernDialog|NewConfirmModal/);
  });

  it("records product-wide action/dialog audit and nested dialog inventory", () => {
    expect(SCE_DESIGN_SYSTEM_06_ACTION_DIALOG_AUDIT.length).toBeGreaterThanOrEqual(12);
    const areas = SCE_DESIGN_SYSTEM_06_ACTION_DIALOG_AUDIT.map((row) => row.area);
    expect(areas).toContain("Communication");
    expect(areas).toContain("Activity Composer");
    expect(areas).toContain("Tournament Planner");
    expect(SCE_DESIGN_SYSTEM_06_LEGACY_ACTION_DIALOG_INVENTORY.length).toBeGreaterThanOrEqual(6);
    expect(SCE_DESIGN_SYSTEM_06_NESTED_DIALOG_COUNTS.NESTED_DIALOG_PATTERNS_FOUND).toBeGreaterThan(
      0,
    );
  });

  it("preserves Activity Composer architecture flags", () => {
    expect(SCE_COMPOSER_ARCHITECTURE_FLAGS.ACTIVITY_COMPOSER_CANONICAL).toBe("YES");
    expect(SCE_COMPOSER_ARCHITECTURE_FLAGS.COMPOSER_REPLACE_ALLOWED).toBe("NO");
    expect(SCE_COMPOSER_ARCHITECTURE_FLAGS.COMPOSER_UNVISITED_NOT_ERROR).toBe("YES");
    expect(readSrc("components/sce/activity-composer/SceActivityComposerFooter.tsx")).toContain(
      "data-sce-composer-action",
    );
  });

  it("requires representative adoption markers", () => {
    expect(SCE_DESIGN_SYSTEM_06_REPRESENTATIVE_ADOPTION.COMMUNICATION).toContain("SceActionLink");
    expect(SCE_DESIGN_SYSTEM_06_REPRESENTATIVE_ADOPTION.ADMIN).toContain("SceConfirmDialog");
    expect(SCE_DESIGN_SYSTEM_06_REPRESENTATIVE_ADOPTION.TOURNAMENT_OPERATIONAL).toContain(
      "SceConfirmDialog",
    );
    expect(readSrc("app/(admin)/dashboard/communication/page.tsx")).toContain("SceActionLink");
  });

  it("locks world-class micro UX governance for actions and dialogs", () => {
    expect(SCE_DESIGN_SYSTEM_06_WORLD_CLASS_MICRO_UX.WORLD_CLASS_MICRO_UX_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_06_WORLD_CLASS_MICRO_UX.LOCAL_MICRO_PATTERN_DRIFT_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_06_WORLD_CLASS_MICRO_UX.ACTION_MICRO_STATES_AUDITED.PRIMARY).toContain(
      "loading",
    );
    expect(
      SCE_DESIGN_SYSTEM_06_WORLD_CLASS_MICRO_UX.COMPOSER_MICRO_STATES_AUDITED.FOOTER,
    ).toContain("guided-weiter");
  });
});
