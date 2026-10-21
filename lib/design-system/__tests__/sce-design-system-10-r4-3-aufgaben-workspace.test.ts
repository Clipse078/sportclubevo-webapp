import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUFGABEN_PERSONAL_ACTION_TYPE_DISPLAY,
  AUFGABEN_PERSONAL_INBOX_LOCKS,
  AUFGABEN_VERWALTUNG_SEMANTICS,
} from "@/lib/aufgaben/action-type-semantics";
import { buildSceActionableErrorPresentation } from "@/lib/design-system/sce-actionable-error-foundation";
import { AUFGABEN_WORKSPACE_SUBTITLES } from "@/lib/nav/aufgaben-workspace-tab-config";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10 R4.3 — Aufgaben PO UAT corrections", () => {
  it("A/B — personal inbox locks and shared three-type semantics", () => {
    expect(AUFGABEN_PERSONAL_INBOX_LOCKS.PERSONAL_ACTION_INBOX_UNIFIED).toBe("YES");
    expect(AUFGABEN_PERSONAL_INBOX_LOCKS.PERSONAL_ACTION_ALL_CONTAINS_ALL_TYPES).toBe("YES");
    expect(AUFGABEN_PERSONAL_ACTION_TYPE_DISPLAY.AUFGABE.tagline).toBe("Etwas erledigen");
    expect(AUFGABEN_PERSONAL_ACTION_TYPE_DISPLAY.TEILNAHME.tagline).toMatch(/Dabei/i);
    expect(AUFGABEN_PERSONAL_ACTION_TYPE_DISPLAY.ANFORDERUNG.tagline).toMatch(/bestätigen/i);
    expect(readSrc("components/admin/aufgaben/PersonalActionTypeChip.tsx")).toContain(
      "personalActionTypePillText",
    );
  });

  it("C/D — Verwaltung and create chooser exclude Teilnahme", () => {
    expect(AUFGABEN_VERWALTUNG_SEMANTICS.TEILNAHME_IN_MANAGEMENT_CREATE_FLOW).toBe("NO");
    const chooser = readSrc("components/admin/aufgaben/AufgabenWorkspaceCreateChooser.tsx");
    expect(chooser).not.toMatch(/Teilnahme/);
    const verwaltungNav = readSrc("components/admin/aufgaben/VerwaltungTypeFilterNav.tsx");
    expect(verwaltungNav).not.toMatch(/attendance|teilnahme:/i);
    expect(verwaltungNav).toContain("Anforderungen");
  });

  it("G — filter-specific actionable error copy", () => {
    expect(
      buildSceActionableErrorPresentation({ context: "AUFGABEN_VERWALTUNG_UNIFIED_LOAD" }).title,
    ).toBe("Aufgaben und Anforderungen konnten nicht geladen werden.");
    expect(buildSceActionableErrorPresentation({ context: "AUFGABEN_MANAGEMENT_LOAD" }).title).toBe(
      "Aufgaben konnten nicht geladen werden.",
    );
    expect(
      buildSceActionableErrorPresentation({ context: "AUFGABEN_REQUIREMENTS_LOAD" }).title,
    ).toBe("Anforderungen konnten nicht geladen werden.");
  });

  it("H/I — workspace subtitles and legend without nested modal regression", () => {
    expect(AUFGABEN_WORKSPACE_SUBTITLES.meine).toContain("beantworten");
    expect(readSrc("components/admin/aufgaben/AufgabenPersonalActionTypeLegend.tsx")).toContain(
      "AufgabenPersonalActionTypeLegend",
    );
    expect(readSrc("components/admin/aufgaben/AufgabenWorkspaceCreateChooser.tsx")).toContain(
      "requestAnimationFrame",
    );
  });

  it("J — Toggle First remains compliant", () => {
    expect(SCE_BINARY_CHECKBOX_COUNTS.REMAINING_LEGACY_BINARY_CHECKBOXES).toBe(0);
  });

  it("E — page uses tenant-scoped service contexts for Verwaltung loads", () => {
    const page = readSrc("app/(admin)/dashboard/aufgaben/page.tsx");
    expect(page).toContain("buildTaskServiceContextForActor");
    expect(page).toContain("buildRequirementServiceContextForActor");
    expect(page).toContain("resolveVerwaltungUnifiedOverviewTaskQuery");
  });
});
