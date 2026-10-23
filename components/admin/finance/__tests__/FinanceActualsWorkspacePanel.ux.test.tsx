import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
  "utf8",
);

const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

describe("FIN-03A FinanceActualsWorkspacePanel UX contract", () => {
  it("uses modal dialog for actual capture and segmented comparison mode", () => {
    expect(panel).toContain("createDialogTitle");
    expect(panel).toContain("SceSegmentedControl");
    expect(panel).toContain("modeYtd");
    expect(panel).toContain("ytdBudgetVarianceUnsupported");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("FIN-03A R4 exposes exactly one canonical Ist-Wert erfassen action in the context strip", () => {
    expect(panel).toContain("captureActual");
    expect(panel).toContain("data-finance-actual-create");
    expect(panel).not.toContain("data-finance-actual-create-entries");
    expect(panel).toContain("renderCaptureActualButton");
    expect(panel).toContain("ms-auto");
    expect(de).toContain('"captureActual": "Ist-Wert erfassen"');
    expect(panel.match(/data-finance-actual-create/g)?.length).toBe(1);
  });

  it("FIN-03A R4 removes duplicate create actions from Ist-Buchungen header and empty state", () => {
    expect(panel).not.toMatch(/entries-header/);
    expect(panel).not.toContain('context: "empty"');
    expect(panel).toContain("snapshot.entries.length === 0");
    expect(panel).toContain("entriesEmpty");
    const entriesSection = panel.slice(
      panel.indexOf('entriesTitle", { year: selectedYearName }'),
      panel.indexOf("<Dialog"),
    );
    expect(entriesSection).not.toContain("renderCaptureActualButton");
  });

  it("FIN-03A R4 view-only users still omit create action", () => {
    expect(panel).toContain("!canMutate");
    expect(panel).toContain("viewOnlyHint");
    expect(panel).toMatch(/canMutate \? \([\s\S]*renderCaptureActualButton/);
  });

  it("FIN-03A R2 create flow shows configured FinanceYear.name", () => {
    expect(panel).toContain("financeYearLabel");
    expect(panel).toContain("data-finance-year-name={selectedYearName}");
    expect(panel).toContain("createActualEntryAction");
    expect(panel).toContain("financeYearId: selectedYearId");
    expect(panel).not.toMatch(/toLocaleDateString\(.*selectedYearName/);
  });

  it("FIN-03A R2 groups comparison by INCOME then EXPENSE without Typ column", () => {
    expect(panel).toContain('row.canonicalSemantic === "INCOME"');
    expect(panel).toContain('row.canonicalSemantic === "EXPENSE"');
    expect(panel).toContain("incomeComparisonRows");
    expect(panel).toContain("expenseComparisonRows");
    expect(panel).toContain("incomeSectionWithYear");
    expect(panel).toContain("expenseSectionWithYear");
    const varianceSection = panel.slice(
      panel.indexOf("function VarianceComparisonSection"),
      panel.indexOf("function VarianceComparisonSection") + 2500,
    );
    expect(varianceSection).toContain("accountColumn");
    expect(varianceSection).not.toContain("semanticColumn");
  });

  it("FIN-03A R2 binds section headings to selected FinanceYear.name", () => {
    expect(panel).toContain('summaryTitleWithYear", { year: selectedYearName }');
    expect(panel).toContain('entriesTitle", { year: selectedYearName }');
    expect(panel).toContain('ytdContextWithYear", {');
    expect(panel).toContain('ytdBudgetReferenceWithYear", { year: selectedYearName }');
    expect(panel).toContain("break-words");
    expect(panel).not.toContain("startDate");
  });

  it("FIN-03A R2 preserves tenant-defined year names verbatim via translation year param", () => {
    expect(de).toContain('"summaryTitleWithYear": "Ist-Summen · {year}"');
    expect(de).toContain('"incomeSectionWithYear": "Einnahmen · {year}"');
    expect(de).toContain('"expenseSectionWithYear": "Ausgaben · {year}"');
    expect(de).toContain('"entriesTitle": "Ist-Buchungen · {year}"');
    const customYearName = "Geschäftsjahr 2026/2027";
    expect(customYearName).toBe("Geschäftsjahr 2026/2027");
    expect(panel).toContain("selectedYearName");
  });

  it("FIN-03A R3 uses shared variance comparison column layout module", () => {
    expect(panel).toContain("finance-variance-comparison-table-layout");
    expect(panel).toContain("FinanceVarianceComparisonColGroup");
    expect(panel).toContain("data-finance-variance-comparison-table");
    expect(de).toContain('"deltaColumn": "Abweichung"');
  });

  it("FIN-03A R4 uses shared Ist-Buchungen bookings table column layout", () => {
    expect(panel).toContain("finance-actuals-bookings-table-layout");
    expect(panel).toContain("FinanceActualsBookingsColGroup");
    expect(panel).toContain("data-finance-actuals-bookings-table");
    expect(panel).toContain("FINANCE_ACTUALS_BOOKINGS_TABLE_CLASS");
    expect(panel).toContain("FINANCE_ACTUALS_BOOKINGS_CELL_NUMERIC_CLASS");
    expect(panel).toContain("FINANCE_ACTUALS_BOOKINGS_CELL_DESCRIPTION_CLASS");
    expect(panel).toContain("FINANCE_ACTUALS_BOOKINGS_TABLE_SCROLL_CLASS");
  });

  it("FIN-03A R2 YTD does not expose delta/favorability columns", () => {
    expect(panel).toMatch(
      /comparisonMode === "FULL_YEAR" \? \([\s\S]*deltaColumn[\s\S]*favorabilityColumn/,
    );
    expect(panel).toContain("ytdBudgetVarianceUnsupported");
    expect(panel).not.toMatch(/\/\s*12/);
    expect(panel).not.toMatch(/prorate/i);
  });

  it("FIN-03A R2 keeps booking list chronological with type column for row clarity", () => {
    expect(panel).toContain("semanticColumn");
    expect(panel).toContain("snapshot.entries.map");
  });

  it("FIN-03A R2 year switching uses router push with yearId", () => {
    expect(panel).toContain('params.set("yearId"');
    expect(panel).toContain("router.push");
  });

  it("FIN-03A R5 variance favorability uses canonical semantic presentation module", () => {
    expect(panel).toContain("finance-variance-favorability-presentation");
    expect(panel).toContain("financeVarianceComparisonSemanticTextClass");
    expect(de).toContain('"favorabilityFavorable": "Günstig"');
    const varianceSection = panel.slice(
      panel.indexOf("function VarianceComparisonSection"),
      panel.indexOf("function VarianceComparisonSection") + 3500,
    );
    expect(varianceSection).not.toContain("row.metrics.favorability ??");
  });
});
