import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const detail = readFileSync(
  join(process.cwd(), "components/admin/finance/scenario/FinanceScenarioDetailPanel.tsx"),
  "utf8",
);
const disclosure = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceWorkspaceDisclosure.tsx"),
  "utf8",
);
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

describe("FIN-04D-05R1 scenario detail visual hierarchy", () => {
  it("layers decision summary, explanation grid, and grouped investigation", () => {
    expect(detail).toContain("data-finance-scenario-decision-summary");
    expect(detail).toContain("data-finance-scenario-decision-explanation");
    expect(detail).toContain("data-finance-scenario-investigation");
    expect(detail).toContain("lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]");
    expect(detail).toContain("data-finance-scenario-drivers");
    expect(detail).toContain("data-finance-scenario-assumptions");
  });

  it("uses section headers and padded surfaces — not bare strips", () => {
    expect(detail).toContain("FINANCE_SECTION_HEADER_CLASS");
    expect(detail).toContain("min-h-[7.5rem]");
    expect(detail).toContain("driversEmptyTitle");
    expect(detail).toContain("assumptions.emptyTitle");
  });

  it("keeps result hero primary metrics and de-emphasizes zero delta", () => {
    expect(detail).toContain("data-finance-scenario-result");
    expect(detail).toContain("data-finance-scenario-primary-delta");
    expect(detail).toContain("deltaIsNeutral");
    expect(detail).toContain("FINANCE_SUMMARY_RESULT_VALUE_CLASS");
  });

  it("groups investigation disclosures as row triggers without stacked show-details links", () => {
    expect(detail).toContain('variant="row"');
    expect(detail).not.toMatch(/variant="stacked"/);
    expect(disclosure).toContain('data-finance-disclosure-variant="row"');
    expect(disclosure).toContain("aria-label={triggerLabel}");
  });

  it("preserves functional boundaries — explicit governance labels, no charts, or client calc", () => {
    expect(detail).toContain("governance.adoptAction");
    expect(detail).toContain("governance.rebaseAction");
    expect(detail).not.toContain("calculateFinanceScenario");
    expect(detail).not.toMatch(/type="checkbox"/);
    expect(de).toContain("Als aktuelle Prognose übernehmen");
    expect(de).toContain("Ausgangsprognose aktualisieren");
    expect(detail).toContain("offsettingDriversIntro");
    expect(detail).toContain("canMutate");
  });

  it("German copy for intentional zero-assumption workspace", () => {
    expect(de).toContain("Weitere Details");
    expect(de).toContain("Noch keine Veränderungen");
    expect(de).toContain("Teste zum Beispiel eine prozentuale Veränderung");
  });
});
