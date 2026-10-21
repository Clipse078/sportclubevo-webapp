import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SCE_AUFGABEN_R4_2_WORKSPACE_LOCKS,
  SCE_DESIGN_SYSTEM_10_R4_2_ANFORDERUNG_DEADLINE,
  SCE_DESIGN_SYSTEM_10_R4_2_CREATE_LOCKS,
} from "@/lib/design-system/sce-design-system-10-r4-2-meta";
import { buildAufgabenWorkspaceTabNavigationConfig } from "@/lib/nav/aufgaben-workspace-tab-config";
import {
  buildLegacyAnforderungenBereichRedirectHref,
  buildVerwaltungManagementHref,
} from "@/lib/personal-actions/aufgaben-scope";
import { formatRequirementConfirmationAggregateLabel } from "@/lib/requirements/presentation";
import { SCE_BINARY_CHECKBOX_COUNTS } from "@/lib/design-system/sce-binary-checkbox-audit";

const ROOT = process.cwd();

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("SCE-DESIGN-SYSTEM-10 R4.2 — unified Aufgaben workspace", () => {
  it("exposes only Meine Aufgaben and Verwaltung primary contexts", () => {
    const config = buildAufgabenWorkspaceTabNavigationConfig({
      showMeine: true,
      showVerwaltung: true,
    });
    expect(config.tabs.map((t) => t.key)).toEqual(["meine", "verwaltung"]);
    expect(config.tabRoutes?.anforderungen).toBeUndefined();
    expect(SCE_AUFGABEN_R4_2_WORKSPACE_LOCKS.ANFORDERUNGEN_AS_PARALLEL_PRIMARY_WORKSPACE).toBe(
      "NO",
    );
  });

  it("preserves legacy bereich=anforderungen via redirect mapping", () => {
    const href = buildLegacyAnforderungenBereichRedirectHref({ bereich: "anforderungen", q: "x" });
    expect(href).toContain("bereich=verwaltung");
    expect(href).toContain("type=requirements");
    expect(href).toContain("q=x");
    expect(readSrc("app/(admin)/dashboard/aufgaben/page.tsx")).toContain(
      "buildLegacyAnforderungenBereichRedirectHref",
    );
  });

  it("uses canonical Erstellen chooser without Teilnahme", () => {
    expect(SCE_DESIGN_SYSTEM_10_R4_2_CREATE_LOCKS.WORKSPACE_PRIMARY_CREATE_CTA).toBe("ERSTELLEN");
    const chooser = readSrc("components/admin/aufgaben/AufgabenWorkspaceCreateChooser.tsx");
    expect(chooser).toContain("Erstellen");
    expect(chooser).toContain("Was möchtest du erstellen?");
    expect(chooser).toContain("aufgaben-create-choice-aufgabe");
    expect(chooser).toContain("aufgaben-create-choice-anforderung");
    expect(chooser).not.toMatch(/Teilnahme/);
    expect(chooser).toContain("requestAnimationFrame");
  });

  it("wires chooser to canonical task and requirement modals without nested default", () => {
    expect(SCE_DESIGN_SYSTEM_10_R4_2_CREATE_LOCKS.NESTED_MODAL_DEFAULT).toBe("NO");
    const chooser = readSrc("components/admin/aufgaben/AufgabenWorkspaceCreateChooser.tsx");
    expect(chooser).toContain("MeineAufgabenQuickCreateDialog");
    expect(chooser).toContain("AufgabenQuickCreateDialog");
    expect(chooser).toContain("RequirementQuickCreateDialog");
    expect(chooser).toContain("hideTrigger");
  });

  it("keeps personal inbox secondary filters and shared type semantics", () => {
    expect(readSrc("components/admin/aufgaben/PersonalInboxFilterNav.tsx")).toContain("Anforderungen");
    expect(readSrc("components/admin/aufgaben/PersonalActionTypeChip.tsx")).toContain(
      "SceDenseMetaChip",
    );
  });

  it("unifies Verwaltung local filters Alle / Aufgaben / Anforderungen", () => {
    expect(readSrc("components/admin/aufgaben/VerwaltungTypeFilterNav.tsx")).toContain(
      "data-verwaltung-type-filter-tier=\"secondary\"",
    );
    expect(buildVerwaltungManagementHref("all")).toContain("bereich=verwaltung");
    expect(buildVerwaltungManagementHref("requirements")).toContain("type=requirements");
  });

  it("surfaces requirement per-recipient aggregate language", () => {
    const label = formatRequirementConfirmationAggregateLabel(
      {
        totalRecipients: 25,
        openCount: 5,
        resolvedCount: 18,
        acknowledgedCount: 18,
        overdueCount: 2,
        resolvedPercent: 72,
      },
      "ACTIVE",
    );
    expect(label).toContain("18 / 25 bestätigt");
    expect(label).toContain("5 offen");
    expect(label).toContain("2 überfällig");
  });

  it("preserves DS-07 errors and R4.1 modal shells", () => {
    expect(readSrc("components/admin/aufgaben/AufgabenVerwaltungWorkspace.tsx")).toContain(
      "AufgabenDomainLoadError",
    );
    expect(readSrc("components/admin/aufgaben/AufgabenFormDialogShell.tsx")).toContain(
      'bodyLayout="scroll"',
    );
    expect(readSrc("components/admin/aufgaben/TaskWorkspace.tsx")).toContain(
      "data-task-workspace-scroll-body",
    );
  });

  it("documents Anforderung deadline rule for new records", () => {
    expect(SCE_DESIGN_SYSTEM_10_R4_2_ANFORDERUNG_DEADLINE.MANDATORY_FOR_NEW).toBe("YES");
    expect(readSrc("app/(admin)/dashboard/aufgaben/requirement-actions.ts")).toContain(
      "Fälligkeitsdatum ist für neue Anforderungen erforderlich",
    );
  });

  it("maintains Toggle First — no new binary checkboxes", () => {
    expect(SCE_BINARY_CHECKBOX_COUNTS.REMAINING_LEGACY_BINARY_CHECKBOXES).toBe(0);
  });

  it("records R4.2 in migration docs", () => {
    expect(readSrc("docs/roadmap/SCE-DESIGN-SYSTEM-10.md")).toMatch(/R4\.2|R4.2/);
    expect(readSrc("docs/design/SCE-DESIGN-SYSTEM-10-PRODUCT-WIDE-MIGRATION-MATRIX.md")).toMatch(
      /R4\.2|unified Aufgaben|Aufgaben workspace/i,
    );
  });
});
