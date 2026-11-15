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

  it("target links panel uses Vorhaben and Sitzungen", () => {
    const panel = read("components/admin/targets/TargetLinksPanel.tsx");
    expect(panel).toContain("CD_TARGET_COPY.linksInitiatives");
    expect(panel).toContain("CD_TARGET_COPY.linksMeetings");
    expect(panel).not.toMatch(/>\s*Initiativen\s*</);
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
    expect(read("components/admin/targets/TargetForm.tsx")).toContain('id="kennzahlen"');
  });
});