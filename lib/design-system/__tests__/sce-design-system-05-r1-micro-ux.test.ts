import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_DESIGN_SYSTEM_05_R1_MICRO_UX,
  SCE_DESIGN_SYSTEM_05_REPRESENTATIVE_ADOPTION,
  SCE_DESIGN_SYSTEM_05_WORLD_CLASS_MICRO_UX,
} from "@/lib/design-system/sce-design-system-05-meta";
import {
  SCE_FORM_CONTROL_MICRO_STATE_MATRIX,
  SCE_FORM_CONTROL_MICRO_UX_DOC_MARKERS,
  SCE_FORM_CONTROL_MICRO_UX_GOVERNANCE,
  SCE_FORM_CONTROL_MICRO_UX_MARKERS,
} from "@/lib/design-system/sce-form-control-micro-ux";
import { SCE_MICRO_UX_GOVERNANCE } from "@/lib/design-system/sce-micro-ux-governance";

const ROOT = process.cwd();

function readDoc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-05 R1 micro-UX guardrails", () => {
  it("documents micro-UX governance in master, roadmap, and inventory", () => {
    const master = readDoc("docs/design/SCE-DESIGN-SYSTEM.md");
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-05.md");
    const inventory = readDoc("docs/design/SCE-DESIGN-SYSTEM-05-FORM-CONTROL-INVENTORY.md");
    for (const marker of SCE_FORM_CONTROL_MICRO_UX_DOC_MARKERS) {
      expect(master).toContain(marker);
      expect(roadmap).toContain(marker);
      expect(inventory).toContain(marker);
    }
  });

  it("locks world-class micro-UX governance flags", () => {
    expect(SCE_MICRO_UX_GOVERNANCE.WORLD_CLASS_MICRO_UX_REQUIRED).toBe("YES");
    expect(SCE_MICRO_UX_GOVERNANCE.LOCAL_MICRO_PATTERN_DRIFT_ALLOWED).toBe("NO");
    expect(SCE_FORM_CONTROL_MICRO_UX_GOVERNANCE.WORLD_CLASS_FORM_CONTROL_MICRO_UX).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_05_R1_MICRO_UX.WORLD_CLASS_FORM_CONTROL_MICRO_UX).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_05_R1_MICRO_UX.DS05_R1_MICRO_UX_STATUS).toBe("READY_FOR_PO_REVIEW");
  });

  it("reports WORLD_CLASS_MICRO_UX DS-05 closure fields", () => {
    expect(SCE_DESIGN_SYSTEM_05_WORLD_CLASS_MICRO_UX.WORLD_CLASS_MICRO_UX_REQUIRED).toBe("YES");
    expect(SCE_DESIGN_SYSTEM_05_WORLD_CLASS_MICRO_UX.MICRO_STATE_COVERAGE).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_05_WORLD_CLASS_MICRO_UX.MICRO_ALIGNMENT_CONSISTENCY).toBe("PASS");
    expect(SCE_DESIGN_SYSTEM_05_WORLD_CLASS_MICRO_UX.LOCAL_MICRO_PATTERN_DRIFT_ALLOWED).toBe("NO");
    expect(SCE_DESIGN_SYSTEM_05_WORLD_CLASS_MICRO_UX.CONTROL_MICRO_STATES_AUDITED).toBe(
      SCE_FORM_CONTROL_MICRO_STATE_MATRIX,
    );
    expect(SCE_DESIGN_SYSTEM_05_WORLD_CLASS_MICRO_UX.MICRO_PATTERNS_CANONICALISED.length).toBeGreaterThan(
      3,
    );
    expect(SCE_DESIGN_SYSTEM_05_WORLD_CLASS_MICRO_UX.MICRO_PATTERNS_DEFERRED.length).toBeGreaterThan(0);
    const roadmap = readDoc("docs/roadmap/SCE-DESIGN-SYSTEM-05.md");
    expect(roadmap).toContain("=== WORLD_CLASS_MICRO_UX ===");
  });

  it("records FEATURE_HEAD_FULL as the R1 implementation SHA (not a placeholder)", () => {
    expect(SCE_DESIGN_SYSTEM_05_R1_MICRO_UX.FEATURE_HEAD_FULL).toMatch(/^[0-9a-f]{40}$/);
    expect(SCE_DESIGN_SYSTEM_05_R1_MICRO_UX.FEATURE_HEAD_FULL).not.toBe("PENDING_COMMIT");
  });

  it("requires stable DOM markers on canonical primitives", () => {
    function expectMarkerWire(relativePath: string, markerKey: keyof typeof SCE_FORM_CONTROL_MICRO_UX_MARKERS) {
      const src = readSrc(relativePath);
      expect(src).toContain("SCE_FORM_CONTROL_MICRO_UX_MARKERS");
      expect(src).toContain(markerKey);
      expect(SCE_FORM_CONTROL_MICRO_UX_MARKERS[markerKey]).toMatch(/^data-sce-/);
    }

    expect(readSrc("components/sce/forms/SceFormField.tsx")).toContain(
      SCE_FORM_CONTROL_MICRO_UX_MARKERS.FORM_FIELD,
    );
    expect(readSrc("components/sce/forms/SceTextInput.tsx")).toContain(
      SCE_FORM_CONTROL_MICRO_UX_MARKERS.TEXT_INPUT,
    );
    expect(readSrc("components/sce/forms/SceTextarea.tsx")).toContain(
      SCE_FORM_CONTROL_MICRO_UX_MARKERS.TEXTAREA,
    );
    expect(readSrc("components/sce/forms/SceSearchField.tsx")).toContain(
      SCE_FORM_CONTROL_MICRO_UX_MARKERS.SEARCH_FIELD,
    );
    expectMarkerWire("components/ui/SceToolbarSelect.tsx", "TOOLBAR_SELECT");
    expectMarkerWire("components/sce/activity-datetime/SceActivityDateInput.tsx", "ACTIVITY_DATE");
    expectMarkerWire("components/sce/activity-datetime/SceActivityTimeInput.tsx", "ACTIVITY_TIME");
    expectMarkerWire("components/admin/shared/SceSegmentedControl.tsx", "SEGMENTED_CONTROL");
    expectMarkerWire("components/ui/SwitchToggle.tsx", "SWITCH_TOGGLE_ROW");
  });

  it("uses semantic tokens for activity field required/error micro presentation", () => {
    const date = readSrc("components/sce/activity-datetime/SceActivityDateInput.tsx");
    const time = readSrc("components/sce/activity-datetime/SceActivityTimeInput.tsx");
    expect(date).not.toContain("text-rose-500");
    expect(time).not.toContain("text-rose-500");
    expect(date).toContain("SCE_FORM_CONTROL_MICRO_UX_REQUIRED_MARKER_CLASS");
    expect(time).toContain("SCE_FORM_CONTROL_MICRO_UX_FIELD_ERROR_CLASS");
  });

  it("consumes shared micro recipes on SwitchToggle and SceFormField", () => {
    expect(readSrc("components/ui/SwitchToggle.tsx")).toContain(
      "SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS",
    );
    expect(readSrc("components/sce/forms/SceFormField.tsx")).toContain(
      "SCE_FORM_CONTROL_MICRO_UX_FIELD_STACK_CLASS",
    );
  });

  it("aligns segmented control focus ring with foundation focus tokens", () => {
    const segmented = readSrc("components/admin/shared/SceSegmentedControl.tsx");
    expect(segmented).toContain("SCE_FORM_CONTROL_MICRO_UX_FOCUS_RING_CLASS");
    expect(segmented).not.toMatch(/focus-visible:ring-\[var\(--sce-primary\)\]/);
  });

  it("marks representative DS-05 binary-setting adoptions", () => {
    expect(SCE_DESIGN_SYSTEM_05_REPRESENTATIVE_ADOPTION.BINARY_SETTINGS).toContain("14");
    function expectBinaryRowWire(relativePath: string) {
      const src = readSrc(relativePath);
      expect(src).toContain("SCE_FORM_CONTROL_MICRO_UX_MARKERS");
      expect(src).toContain("BINARY_SETTING_ROW");
    }
    expectBinaryRowWire("components/admin/cms/LayoutConfigPanel.tsx");
    expectBinaryRowWire("components/admin/planner/PlannerEntryPublicationFields.tsx");
    expectBinaryRowWire(
      "components/admin/communication/personal-signature/PersonalSignatureComposerField.tsx",
    );
    expect(readSrc("components/admin/communication/email-sender/EmailSenderWorkspace.tsx")).toContain(
      "SceFormField",
    );
    expect(readSrc("components/admin/competitions/CompetitionsSearchBar.tsx")).toContain("SceSearchField");
  });
});
