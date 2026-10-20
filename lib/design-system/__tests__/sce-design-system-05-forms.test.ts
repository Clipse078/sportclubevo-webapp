import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_05_CANONICAL_FORM_PRIMITIVES,
  SCE_DESIGN_SYSTEM_05_DOC_MARKERS,
  SCE_DESIGN_SYSTEM_05_FORM_CONTROL_AUDIT,
  SCE_DESIGN_SYSTEM_05_GOVERNANCE,
  SCE_DESIGN_SYSTEM_05_PACKAGE_KEY,
  SCE_DESIGN_SYSTEM_05_PO_FLAGS,
  SCE_DESIGN_SYSTEM_05_REPRESENTATIVE_ADOPTION,
} from "@/lib/design-system/sce-design-system-05-meta";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";
import { SCE_FORM_FIELD_LAYERS } from "@/lib/design-system/sce-form-control-foundation";
import { SwitchToggle } from "@/components/ui/SwitchToggle";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-05 forms & controls guardrails", () => {
  it("documents DS-05 roadmap, inventory, and master design system section", () => {
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-05.md");
    expect(roadmap).toContain(SCE_DESIGN_SYSTEM_05_PACKAGE_KEY);
    expect(roadmap).toContain("FORM_CONTROL_SYSTEM_PRODUCT_WIDE");

    const inventory = readDoc("docs/design/SCE-DESIGN-SYSTEM-05-FORM-CONTROL-INVENTORY.md");
    expect(inventory).toContain("FORM_CONTROL_MIGRATION_INVENTORY");

    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    for (const marker of SCE_DESIGN_SYSTEM_05_DOC_MARKERS.slice(0, 6)) {
      expect(master).toContain(marker);
    }
  });

  it("locks form system and Toggle First governance", () => {
    expect(SCE_DESIGN_SYSTEM_05_PO_FLAGS.FORM_CONTROL_SYSTEM_PRODUCT_WIDE).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_05_GOVERNANCE.PARALLEL_PATTERN_INTRODUCED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_05_GOVERNANCE.BINARY_CONTROL_COMPLIANCE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_05_GOVERNANCE.NEW_BINARY_CHECKBOXES).toBe(0);
    expect(SCE_DESIGN_SYSTEM_05_GOVERNANCE.CANONICAL_TOGGLES_USED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_05_GOVERNANCE.WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE).toBe("PASS");
  });

  it("defines canonical form primitives without parallel Input2 families", () => {
    expect(SCE_DESIGN_SYSTEM_05_CANONICAL_FORM_PRIMITIVES.FORM_FIELD).toBe("SceFormField");
    expect(SCE_DESIGN_SYSTEM_05_CANONICAL_FORM_PRIMITIVES.SEARCH).toBe("SceSearchField");
    expect(SCE_DESIGN_SYSTEM_05_CANONICAL_FORM_PRIMITIVES.SWITCH_TOGGLE).toBe("SwitchToggle");
    expect(readSrc("components/sce/forms/SceFormField.tsx")).toContain("SceFormField");
    expect(readSrc("components/sce/forms/SceSearchField.tsx")).toContain("data-sce-search-field");
    const repoRoot = readSrc("lib/design-system/sce-design-system-05-meta.ts");
    expect(repoRoot).not.toMatch(/SceInput2|ModernFormField|NewSelect/);
  });

  it("records product-wide form audit coverage", () => {
    expect(SCE_DESIGN_SYSTEM_05_FORM_CONTROL_AUDIT.length).toBeGreaterThanOrEqual(12);
    const areas = SCE_DESIGN_SYSTEM_05_FORM_CONTROL_AUDIT.map((row) => row.area);
    expect(areas).toContain("Communication");
    expect(areas).toContain("Activity Composer");
    expect(areas).toContain("Wochenplaner / Planning Hub");
  });

  it("requires representative adoption markers", () => {
    expect(SCE_DESIGN_SYSTEM_05_REPRESENTATIVE_ADOPTION.COMMUNICATION).toContain("EmailSenderWorkspace");
    expect(SCE_DESIGN_SYSTEM_05_REPRESENTATIVE_ADOPTION.SEARCH_FILTER).toContain("CompetitionsSearchBar");
    expect(SCE_BINARY_CHECKBOX_COUNTS.BINARY_SETTING_CHECKBOXES_MIGRATED_DS05).toBeGreaterThanOrEqual(
      10,
    );
  });

  it("preserves Activity Composer architecture guardrails", () => {
    const composer = readSrc("components/sce/activity-composer/SceActivityComposer.tsx");
    expect(composer).toContain("SceActivityComposer");
    expect(composer).not.toContain("SceFormField2");
    expect(SwitchToggle).toBeDefined();
  });

  it("migrated preference surfaces use SwitchToggle not setting checkboxes", () => {
    const notifications = readSrc("components/admin/notifications/NotificationPreferencesSection.tsx");
    expect(notifications).toContain("SwitchThumb");
    expect(notifications).not.toContain('type="checkbox"');

    const commPrefs = readSrc(
      "components/admin/communication/preferences/CommunicationPreferencesSection.tsx",
    );
    expect(commPrefs).toContain("SwitchThumb");
    expect(commPrefs).not.toContain('type="checkbox"');

    const plannerCreate = readSrc("components/admin/planner/PlannerEntryCreateForm.tsx");
    expect(plannerCreate).not.toContain('type="checkbox"');
    expect(plannerCreate).toContain("PlannerEntryCreatePublicationFields");
  });

  it("documents form-field composition layers", () => {
    expect(SCE_FORM_FIELD_LAYERS).toContain("LABEL");
    expect(SCE_FORM_FIELD_LAYERS).toContain("VALIDATION");
    const foundation = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    expect(foundation).toContain("UNVISITED ≠ ERROR");
  });

  it("uses canonical search field in club-team selector wrapper", () => {
    const search = readSrc("components/sce/club-team-selector/SceClubTeamSearch.tsx");
    expect(search).toContain("SceSearchField");
  });
});
