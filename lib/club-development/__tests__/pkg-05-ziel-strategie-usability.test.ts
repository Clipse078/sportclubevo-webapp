import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("PKG-05 Ziel ↔ Strategie usability", () => {
  it("target detail distinguishes Zielstatus from Prüfstatus and German links", () => {
    const page = read("app/(admin)/vereinsleitung/targets/[id]/page.tsx");
    expect(page).toContain("TargetMetricsEmptyState");
    expect(page).toContain("CD_TARGET_COPY.governanceSection");
    expect(page).toContain("CD_TARGET_COPY.reviewStatusLabel");
    expect(page).not.toMatch(/Initiativen|Meetings|Governance/);
  });

  it("target links panel uses Sitzungen; Vorhaben live in contextual section", () => {
    const panel = read("components/admin/targets/TargetLinksPanel.tsx");
    const section = read("components/admin/targets/TargetInitiativeLinksSection.tsx");
    expect(panel).toContain("CD_TARGET_COPY.linksMeetings");
    expect(section).toContain("CD_TARGET_COPY.vorhabenSectionHeading");
    expect(panel).not.toMatch(/>\s*Meetings\s*</);
  });

  it("strategy overview shows unknown progress reasons instead of empty bars", () => {
    const overview = read("components/admin/club-development/StrategyOverviewPanel.tsx");
    expect(overview).toContain("StrategyProgressIndicator");
    expect(overview).not.toMatch(/Delivery/);
    expect(overview).toContain("focusTargetIds");
  });

  it("metric editor anchor reused from empty state", () => {
    const empty = read("components/admin/targets/TargetMetricsEmptyState.tsx");
    expect(empty).toContain("Kennzahl hinzufügen");
    expect(empty).toContain("/edit#kennzahlen");
    const form = read("components/admin/targets/TargetForm.tsx");
    expect(form).toContain('id="kennzahlen"');
    expect(form).toContain("Kennzahl {idx + 1}");
    expect(form).toContain("PLANNING_EDITOR_STICKY_FOOTER_CLASS");
    expect(form).toContain("data-testid=\"target-form-submit\"");
    expect(form).not.toContain("Metrik {idx + 1}");
  });

  it("target PUT route persists Kennzahlen on edit save", () => {
    const route = read("app/api/targets/[id]/route.ts");
    expect(route).toContain("syncTargetMetricsForTarget");
    expect(route).toContain("normalizeTargetMetricsFromBody");
  });
});