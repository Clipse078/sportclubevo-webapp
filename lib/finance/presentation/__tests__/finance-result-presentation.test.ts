import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sceSemanticIconClass } from "@/lib/design-system/sce-feedback-status-micro-ux";
import {
  deriveFinanceResultPresentation,
  financeActualResultSemanticTextClass,
  financeResultPresentationToFeedbackTone,
} from "@/lib/finance/presentation/finance-result-presentation";
import {
  financeVarianceComparisonSemanticTextClass,
} from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import { computeAccountVarianceMetrics } from "@/lib/finance/actual/variance-semantics";

const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
  "utf8",
);

describe("FIN-03B-R2 actual result presentation", () => {
  it("1 positive result maps to SUCCESS tone", () => {
    expect(deriveFinanceResultPresentation(15_000_00)).toBe("POSITIVE");
    expect(financeResultPresentationToFeedbackTone("POSITIVE")).toBe("SUCCESS");
    expect(financeActualResultSemanticTextClass(15_000_00)).toBe(
      sceSemanticIconClass("SUCCESS"),
    );
  });

  it("2 negative result maps to ERROR tone", () => {
    expect(deriveFinanceResultPresentation(-13_500_00)).toBe("NEGATIVE");
    expect(financeResultPresentationToFeedbackTone("NEGATIVE")).toBe("ERROR");
    expect(financeActualResultSemanticTextClass(-13_500_00)).toBe(
      sceSemanticIconClass("ERROR"),
    );
  });

  it("3 zero result stays NEUTRAL without semantic override class", () => {
    expect(deriveFinanceResultPresentation(0)).toBe("NEUTRAL");
    expect(financeActualResultSemanticTextClass(0)).toBe("");
  });

  it("4–6 period summary Ist-Ergebnis uses canonical helper in panel", () => {
    expect(panel).toContain("finance-result-presentation");
    expect(panel).toContain("financeActualResultSemanticTextClass");
    expect(panel).toContain('data-finance-actual-result="period"');
    expect(panel).not.toMatch(/resultMinor\s*[<>]=?\s*0[\s\S]*text-\[var\(--sce-/);
  });

  it("7–9 YTD Ist-Ergebnis uses same helper", () => {
    expect(panel).toContain('data-finance-actual-result="ytd"');
  });

  it("10 full-year actual result uses same presentation path", () => {
    expect(panel).toContain("snapshot.variance.actualSummary.resultMinor");
    expect(panel).toMatch(
      /financeActualResultSemanticTextClass\([\s\S]*snapshot\.variance\.actualSummary\.resultMinor/,
    );
  });

  it("11 FIN-03A favorability remains separate module", () => {
    expect(panel).toContain("finance-variance-favorability-presentation");
    expect(panel).toContain("financeVarianceComparisonSemanticTextClass");
    const favorable = computeAccountVarianceMetrics({
      canonicalSemantic: "EXPENSE",
      approvedBudgetMinor: 50_000_00,
      actualMinor: 13_500_00,
    });
    expect(favorable.favorability).toBe("FAVORABLE");
    expect(
      financeVarianceComparisonSemanticTextClass({
        favorability: favorable.favorability,
        hasComparison: true,
      }),
    ).toBe(sceSemanticIconClass("SUCCESS"));
    expect(financeActualResultSemanticTextClass(-13_500_00)).toBe(
      sceSemanticIconClass("ERROR"),
    );
  });

  it("12 income amounts are not auto-colored as success", () => {
    const incomeBlock = panel.slice(
      panel.indexOf('t("actualIncome")'),
      panel.indexOf('t("actualExpense")'),
    );
    expect(incomeBlock).toContain("FINANCE_SUMMARY_VALUE_CLASS");
    expect(incomeBlock).not.toContain("financeActualResultSemanticTextClass");
  });

  it("13 expense amounts are not auto-colored as danger", () => {
    const expenseBlock = panel.slice(
      panel.indexOf('t("actualExpense")'),
      panel.indexOf('t("actualResult")'),
    );
    expect(expenseBlock).toContain("FINANCE_SUMMARY_VALUE_CLASS");
    expect(expenseBlock).not.toContain("financeActualResultSemanticTextClass");
  });

  it("14 annual budget reference stays neutral", () => {
    const budgetRef = panel.slice(panel.indexOf("annualBudgetReferenceTitle"));
    expect(budgetRef).toContain("text-muted-foreground");
    expect(budgetRef.slice(0, 400)).not.toContain("financeActualResultSemanticTextClass");
  });

  it("15 management signals use inline semantic icon presentation", () => {
    expect(panel).toContain("finance-management-signal-presentation");
    expect(panel).toContain("sceSemanticIconClass");
    expect(panel).not.toContain("SceSemanticFeedback");
  });

  it("16 redundant YTD negative text signal removed from derivation", () => {
    const signalsModule = readFileSync(
      join(process.cwd(), "lib/finance/actual/management-review-signals.ts"),
      "utf8",
    );
    expect(signalsModule).not.toContain("YTD_RESULT_NEGATIVE");
  });
});

describe("FIN-03B-R2 regression (R1 slicer + budget semantics)", () => {
  const slicer = readFileSync(
    join(process.cwd(), "components/admin/finance/FinanceMeasurementPeriodSlicer.tsx"),
    "utf8",
  );
  const actualsPage = readFileSync(
    join(process.cwd(), "app/(admin)/dashboard/finance/actuals/page.tsx"),
    "utf8",
  );

  it("17–19 Sep–Okt, Q1, and URL persistence unchanged", () => {
    expect(slicer).toContain("resolveNextMonthRangeSelection");
    expect(actualsPage).toContain("parseFinanceMeasurementPeriodFromSearchParams");
    expect(panel).toContain("FinanceQuarterPeriodSlicer");
    expect(panel).toContain("periodStartIndex");
  });

  it("20 no sub-year budget variance columns", () => {
    expect(panel).not.toMatch(/\/\s*12/);
    expect(panel).not.toMatch(/favorabilityColumn[\s\S]*comparisonMode === "MONTH"/);
  });

  it("21 FinanceYear.name remains verbatim via selectedYearName", () => {
    expect(panel).toContain("selectedYearName");
    expect(panel).toContain("summaryTitleWithPeriodAndYear");
  });

  it("22 exactly one Ist-Wert erfassen action", () => {
    expect(panel.match(/data-finance-actual-create/g)?.length).toBe(1);
  });
});
