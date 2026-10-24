import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastWorkspacePanel.tsx"),
  "utf8",
);
const rolling = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastRollingUxSections.tsx"),
  "utf8",
);
const evolutionChart = readFileSync(
  join(
    process.cwd(),
    "components/admin/finance/forecast/FinanceForecastEvolutionChart.tsx",
  ),
  "utf8",
);
const page = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/forecast/page.tsx"),
  "utf8",
);
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

describe("FIN-04C-05 rolling forecast workspace UX", () => {
  it("A. current forecast summary uses canonical currency labels", () => {
    expect(panel).toContain("totalIncome");
    expect(de).toContain('"totalIncome": "Prognose-Einnahmen"');
    expect(de).toContain('"plannedResult": "Prognose-Ergebnis"');
    expect(panel).toContain("FINANCE_SUMMARY_STRIP_SURFACE_CLASS");
  });

  it("B. formalization CTA visible only for manage (canMutate)", () => {
    expect(panel).toContain("canFormalize={canMutate}");
    expect(rolling).toContain('data-finance-formal-reforecast-action="open"');
    expect(rolling).toMatch(/canFormalize \? \([\s\S]*FinanceFormalReforecastDialog/);
    expect(de).toContain("Neue Prognose festhalten");
  });

  it("C. dialog uses preview contract, default date field, optional label, no checkbox", () => {
    expect(rolling).toContain("previewFormalReforecastAction");
    expect(rolling).toContain("formalizeCurrentForecastAction");
    expect(rolling).toContain('type="date"');
    expect(rolling).toContain("labelPlaceholder");
    expect(rolling).toContain("amountsUnchangedHint");
    expect(rolling).not.toMatch(/type="checkbox"/);
    expect(rolling).toContain("<Dialog");
  });

  it("D. success refreshes via router and shows restrained status", () => {
    expect(rolling).toContain("router.refresh()");
    expect(rolling).toContain("formalReforecast.success");
    expect(panel).toContain("successMessage");
  });

  it("E. stale conflict maps to understandable copy and refresh", () => {
    expect(de).toContain(
      "Die aktuelle Prognose wurde inzwischen geändert",
    );
    expect(rolling).toContain('result.outcome === "STALE_CURRENT"');
  });

  it("F. Prognoseentwicklung chart and compact governance history", () => {
    expect(evolutionChart).toContain('data-finance-surface="prognoseentwicklung"');
    expect(rolling).toContain('data-finance-surface="prognoseverlauf-compact"');
    expect(rolling).toContain("FinanceForecastEvolutionChart");
    expect(de).toContain('"evolutionTitle": "Prognoseentwicklung"');
  });

  it("G. change since previous uses signed neutral management deltas", () => {
    expect(rolling).toContain("formatFinanceManagementPlanningSignedMinor");
    expect(rolling).toContain('data-finance-surface="change-since-previous"');
    expect(de).toContain("Noch keine frühere Prognose");
  });

  it("H. largest changes capped from comparison read model", () => {
    expect(rolling).toContain("largestChanges");
    expect(rolling).toContain("selectMeaningfulForecastChangeDrivers");
    expect(de).toContain("Grösste Veränderungen");
  });

  it("I. budget context uses approved baseline comparison only", () => {
    const queryService = readFileSync(
      join(process.cwd(), "lib/finance/services/finance-forecast-query-service.ts"),
      "utf8",
    );
    expect(queryService).toContain("getCurrentForecastVsApprovedBudget");
    expect(page).toContain("loadForecastWorkspaceRollingUxData");
    expect(de).toContain("Kein genehmigtes Budget");
  });

  it("J. automatic forecast remains separate section after current forecast", () => {
    const afterRolling = panel.slice(panel.indexOf("<FinanceForecastRollingUxSections"));
    expect(afterRolling).toContain("<FinanceProjectionWorkspaceSection");
    expect(de).toContain("Automatische Prognose übernehmen");
    expect(de).toContain("Neue Prognose festhalten");
  });

  it("K. version remount key preserved on forecast page", () => {
    expect(page).toContain("key={snapshot?.versionId");
  });

  it("L. view-only hides formalize CTA via canMutate", () => {
    expect(panel).toContain("canFormalize={canMutate}");
  });

  it("M. responsive min-w-0 overflow patterns retained", () => {
    expect(panel).toContain("min-w-0 overflow-x-auto");
  });

  it("N. dialog fields use labels and aria alerts for errors", () => {
    expect(rolling).toContain("htmlFor={asOfId}");
    expect(rolling).toContain('role="alert"');
  });

  it("O. no raw enum leakage in tenant strings", () => {
    expect(rolling).not.toContain("MANUAL_REFORECAST");
    expect(rolling).not.toContain("AUTOMATIC_FORECAST_ADOPTION");
    expect(rolling).not.toContain("SUPERSEDED");
    expect(de).not.toContain("MANUAL_REFORECAST");
  });

  it("P. no fake monthly phasing chart in rolling UX", () => {
    expect(rolling).not.toContain("FinanceProjectionOutlookChart");
  });

  it("documents actualsThroughDate default (Datenstand only in dialog)", () => {
    expect(rolling).toContain("data-finance-formal-reforecast-more-details-trigger");
    expect(rolling).toContain("formalReforecast.actualsThroughLabel");
    const doc = readFileSync(
      join(process.cwd(), "docs/finance/SCE-FINANCE-04C-05-WORKSPACE-UX.md"),
      "utf8",
    );
    expect(doc).toContain("actualsThroughDate = asOfDate");
  });
});
