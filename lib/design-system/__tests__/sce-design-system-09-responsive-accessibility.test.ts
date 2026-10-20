import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_08_DS09_HANDOFF,
  SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT,
} from "@/lib/design-system/sce-design-system-08-meta";
import {
  SCE_ACCESSIBILITY_CONTRACT,
  SCE_RESPONSIVE_SYSTEM_LOCKS,
  SCE_TOUCH_TARGET_CONTRACT,
} from "@/lib/design-system/sce-responsive-accessibility-foundation";
import {
  SCE_DIALOG_MOBILE_SHELL_CLASS,
  SCE_ICON_BUTTON_TOUCH_TARGET_CLASS,
  SCE_PAGE_OVERFLOW_GUARD_CLASS,
} from "@/lib/design-system/sce-responsive-accessibility-micro-ux";
import {
  SCE_DESIGN_SYSTEM_09_DOC_MARKERS,
  SCE_DESIGN_SYSTEM_09_DS10_HANDOFF,
  SCE_DESIGN_SYSTEM_09_GOVERNANCE,
  SCE_DESIGN_SYSTEM_09_PACKAGE_KEY,
  SCE_DESIGN_SYSTEM_09_PO_REVIEW,
  SCE_DESIGN_SYSTEM_09_REPRESENTATIVE_ADOPTION,
  SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_AUDIT,
  SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_INVENTORY,
} from "@/lib/design-system/sce-design-system-09-meta";
import { SCE_RESPONSIVE_DIALOG_CONTRACT } from "@/lib/design-system/sce-action-dialog-foundation";
import { SCE_APP_MAIN_COLUMN } from "@/lib/shell/responsive-layout";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-09 responsive & accessibility guardrails", () => {
  it("documents DS-09 roadmap, inventory, DS-10 handoff, and master section", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-09.md");
    expect(roadmap).toContain(SCE_DESIGN_SYSTEM_09_PACKAGE_KEY);
    expect(roadmap).toContain("RESPONSIVE_SYSTEM_PRODUCT_WIDE");

    const inventory = readDoc("docs/design/SCE-DESIGN-SYSTEM-09-RESPONSIVE-A11Y-INVENTORY.md");
    expect(inventory).toContain("RESPONSIVE_A11Y_MIGRATION_INVENTORY");

    const ds10Handoff = readDoc("docs/design/SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md");
    expect(ds10Handoff).toContain("PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO");

    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    for (const marker of SCE_DESIGN_SYSTEM_09_DOC_MARKERS.slice(0, 10)) {
      expect(master).toContain(marker);
    }
  });

  it("locks baseline STAGE and PO review readiness", () => {
    expect(SCE_DESIGN_SYSTEM_09_PO_REVIEW.BASELINE_STAGE_HEAD).toBe(
      "3224666df3b67cee8c0df38dbc442fb424abc7e3",
    );
    expect(SCE_DESIGN_SYSTEM_09_PO_REVIEW.DS09_STATUS).toBe("READY FOR PO REVIEW");
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.SCE_DESIGN_SYSTEM_09_READY_FOR_PO_REVIEW).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.SCE_DESIGN_SYSTEM_COMPLIANCE).toBe("PASS");
  });

  it("consumes DS-08 → DS-09 handoff debt", () => {
    expect(SCE_DESIGN_SYSTEM_08_DS09_HANDOFF.RESPONSIVE_FINAL_HARDENING).toBe("DS09");
    expect(SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT.length).toBeGreaterThanOrEqual(20);
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.DS08_HANDOFF_DEBT).toEqual(
      SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT,
    );
  });

  it("locks responsive, accessibility, and DS-10 programme gates", () => {
    expect(SCE_RESPONSIVE_SYSTEM_LOCKS.RESPONSIVE_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_RESPONSIVE_SYSTEM_LOCKS.HORIZONTAL_PAGE_OVERFLOW_ALLOWED).toBe("NO");
    expect(SCE_ACCESSIBILITY_CONTRACT.KEYBOARD_ACCESS_REQUIRED).toBe("YES");
    expect(SCE_ACCESSIBILITY_CONTRACT.VISIBLE_FOCUS_REQUIRED).toBe("YES");
    expect(SCE_ACCESSIBILITY_CONTRACT.COLOUR_ONLY_SEMANTICS_ALLOWED).toBe("NO");
    expect(SCE_TOUCH_TARGET_CONTRACT.TOUCH_TARGET_HARDENING_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_09_DS10_HANDOFF.DS10_FINAL_ADOPTION_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_09_GOVERNANCE.CANONICAL_TOGGLES_USED).toBe("YES");
  });

  it("defines product-wide responsive/a11y audit with representative surfaces", () => {
    expect(SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_AUDIT.length).toBeGreaterThanOrEqual(14);
    const areas = SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_AUDIT.map((row) => row.area);
    expect(areas).toContain("People & Access");
    expect(areas).toContain("Roles & Permissions");
    expect(areas).toContain("Communication");
    expect(areas).toContain("Mobile bottom navigation");
    expect(SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_INVENTORY.length).toBe(
      SCE_DESIGN_SYSTEM_09_RESPONSIVE_A11Y_AUDIT.length,
    );
  });

  it("records representative adoption in product code", () => {
    expect(SCE_DESIGN_SYSTEM_09_REPRESENTATIVE_ADOPTION.DIALOG_MOBILE_SHELL).toBe("HARDENED");

    const navCss = readSrc("app/(admin)/global-app-navigation.css");
    expect(navCss).toContain(".sce-mobile-bottom-nav-item:focus-visible");

    expect(SCE_APP_MAIN_COLUMN).toContain("overflow-x-clip");

    const dialog = readSrc("components/ui/Dialog.tsx");
    expect(dialog).toContain("SCE_DIALOG_MOBILE_SHELL_CLASS");
    expect(SCE_DIALOG_MOBILE_SHELL_CLASS).toContain("max-md:");
    expect(dialog).toContain("data-sce-dialog-mobile-adaptive");
    expect(SCE_RESPONSIVE_DIALOG_CONTRACT.STANDARD_DIALOG_MOBILE_ADAPTIVE).toBe("YES");

    const pageHeader = readSrc("components/ui/page/PageHeader.tsx");
    expect(pageHeader).toContain("break-words");

    const people = readSrc("components/admin/users/TenantUsersSearchableList.tsx");
    expect(people).toContain("SCE_DENSE_TOOLBAR_RESPONSIVE_GRID_CLASS");

    const iconBtn = readSrc("components/sce/actions/SceIconButton.tsx");
    expect(iconBtn).toContain("SCE_ICON_BUTTON_TOUCH_TARGET_CLASS");
  });

  it("locks page overflow guard class contract", () => {
    expect(SCE_PAGE_OVERFLOW_GUARD_CLASS).toContain("overflow-x-clip");
  });
});
