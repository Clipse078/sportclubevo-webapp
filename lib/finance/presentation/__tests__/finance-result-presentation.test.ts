import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sceSemanticIconClass } from "@/lib/design-system/sce-feedback-status-micro-ux";
import {
  deriveFinanceResultPresentation,
  financeResultPresentationToFeedbackTone,
  financeResultSemanticTextClass,
} from "@/lib/finance/presentation/finance-result-presentation";
import {
  financeVarianceComparisonSemanticTextClass,
} from "@/lib/finance/presentation/finance-variance-favorability-presentation";
import { computeAccountVarianceMetrics } from "@/lib/finance/actual/variance-semantics";

const actualsPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceActualsWorkspacePanel.tsx"),
  "utf8",
);
const overviewPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceOverviewPanel.tsx"),
  "utf8",
);
const budgetPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceBudgetWorkspacePanel.tsx"),
  "utf8",
);

describe("FIN-03B-R3 canonical finance result presentation (helper)", () => {
  it("1 positive result maps to SUCCESS tone", () => {
    expect(deriveFinanceResultPresentation(15_000_00)).toBe("POSITIVE");
    expect(financeResultPresentationToFeedbackTone("POSITIVE")).toBe("SUCCESS");
    expect(financeResultSemanticTextClass(15_000_00)).toBe(
      sceSemanticIconClass("SUCCESS"),
    );
  });

  it("2 negative result maps to DANGER/ERROR tone", () => {
    expect(deriveFinanceResultPresentation(-13_500_00)).toBe("NEGATIVE");
    expect(financeResultPresentationToFeedbackTone("NEGATIVE")).toBe("ERROR");
    expect(financeResultSemanticTextClass(-13_500_00)).toBe(
      sceSemanticIconClass("ERROR"),
    );
  });

  it("3 zero result stays NEUTRAL without semantic override class", () => {
    expect(deriveFinanceResultPresentation(0)).toBe("NEUTRAL");
    expect(financeResultSemanticTextClass(0)).toBe("");
  });
});

describe("FIN-03B-R3 overview approved budget result", () => {
  it("4–6 Ergebnis uses canonical helper; income/expense stay neutral", () => {
    expect(overviewPanel).toContain("finance-result-presentation");
    expect(overviewPanel).toContain("financeResultSemanticTextClass(reporting.resultMinor)");
    expect(overviewPanel).toContain('data-finance-result="overview-approved-baseline"');
    const incomeBlock = overviewPanel.slice(
      overviewPanel.indexOf("reportingIncome"),
      overviewPanel.indexOf("reportingExpense"),
    );
    expect(incomeBlock).not.toContain("financeResultSemanticTextClass");
    const expenseBlock = overviewPanel.slice(
      overviewPanel.indexOf("reportingExpense"),
      overviewPanel.indexOf("reportingResult"),
    );
    expect(expenseBlock).not.toContain("financeResultSemanticTextClass");
  });
});

describe("FIN-03B-R3 budget workspace result", () => {
  it("9–12 working and approved baseline results use canonical helper", () => {
    expect(budgetPanel).toContain("financeResultSemanticTextClass(localTotals.resultMinor)");
    expect(budgetPanel).toContain(
      "financeResultSemanticTextClass(\n                    props.snapshot.approvedBaseline.totals.resultMinor",
    );
    expect(budgetPanel).toContain('data-finance-result="working-totals"');
    expect(budgetPanel).toContain('data-finance-result="approved-baseline"');
    const incomeBlock = budgetPanel.slice(
      budgetPanel.indexOf('t("totalIncome")'),
      budgetPanel.indexOf('t("totalExpense")'),
    );
    expect(incomeBlock).not.toContain("financeResultSemanticTextClass");
  });
});

describe("FIN-03B-R3 Ist workspace (R2 preserved via generalized helper)", () => {
  it("13–16 period, YTD, and full-year actual result use financeResultSemanticTextClass", () => {
    expect(actualsPanel).toContain("finance-result-presentation");
    expect(actualsPanel).toContain("financeResultSemanticTextClass");
    expect(actualsPanel).toContain('data-finance-actual-result="period"');
    expect(actualsPanel).toContain('data-finance-actual-result="ytd"');
    expect(actualsPanel).toContain("snapshot.variance.actualSummary.resultMinor");
    expect(actualsPanel).toMatch(
      /financeResultSemanticTextClass\([\s\S]*snapshot\.variance\.actualSummary\.resultMinor/,
    );
    expect(actualsPanel).not.toMatch(/resultMinor\s*[<>]=?\s*0[\s\S]*text-\[var\(--sce-/);
  });

  it("17–18 income and expense amounts are not auto-colored as result semantics", () => {
    const incomeBlock = actualsPanel.slice(
      actualsPanel.indexOf('t("actualIncome")'),
      actualsPanel.indexOf('t("actualExpense")'),
    );
    expect(incomeBlock).toContain("FINANCE_SUMMARY_VALUE_CLASS");
    expect(incomeBlock).not.toContain("financeResultSemanticTextClass");
    const expenseBlock = actualsPanel.slice(
      actualsPanel.indexOf('t("actualExpense")'),
      actualsPanel.indexOf('t("actualResult")'),
    );
    expect(expenseBlock).toContain("FINANCE_SUMMARY_VALUE_CLASS");
    expect(expenseBlock).not.toContain("financeResultSemanticTextClass");
  });

  it("19 annual budget reference stays neutral", () => {
    const budgetRef = actualsPanel.slice(actualsPanel.indexOf("annualBudgetReferenceTitle"));
    expect(budgetRef).toContain("text-muted-foreground");
    expect(budgetRef.slice(0, 400)).not.toContain("financeResultSemanticTextClass");
  });

  it("20–22 favorability remains separate from result sign", () => {
    expect(actualsPanel).toContain("finance-variance-favorability-presentation");
    expect(actualsPanel).toContain("financeVarianceComparisonSemanticTextClass");
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
    expect(financeResultSemanticTextClass(-13_500_00)).toBe(
      sceSemanticIconClass("ERROR"),
    );
  });

  it("15 management signals use inline semantic icon presentation", () => {
    expect(actualsPanel).toContain("finance-management-signal-presentation");
    expect(actualsPanel).toContain("sceSemanticIconClass");
    expect(actualsPanel).not.toContain("SceSemanticFeedback");
  });

  it("16 redundant YTD negative text signal removed from derivation", () => {
    const signalsModule = readFileSync(
      join(process.cwd(), "lib/finance/actual/management-review-signals.ts"),
      "utf8",
    );
    expect(signalsModule).not.toContain("YTD_RESULT_NEGATIVE");
  });
});

describe("FIN-03B-R3 finance-wide result inventory (static)", () => {
  it("documents surfaces that render aggregate financial result values", () => {
    const inventory = [
      "components/admin/finance/FinanceOverviewPanel.tsx",
      "components/admin/finance/FinanceBudgetWorkspacePanel.tsx",
      "components/admin/finance/FinanceActualsWorkspacePanel.tsx",
    ];
    for (const path of inventory) {
      const source = readFileSync(join(process.cwd(), path), "utf8");
      expect(source).toContain("financeResultSemanticTextClass");
    }
    const reportingReadModel = readFileSync(
      join(process.cwd(), "lib/finance/reporting/reporting-read-model.ts"),
      "utf8",
    );
    expect(reportingReadModel).toContain("resultMinor");
    expect(reportingReadModel).not.toContain("financeResultSemanticTextClass");
  });
});

describe("FIN-03B-R3 regression (R1 slicer + budget semantics)", () => {
  const slicer = readFileSync(
    join(process.cwd(), "components/admin/finance/FinanceMeasurementPeriodSlicer.tsx"),
    "utf8",
  );
  const actualsPage = readFileSync(
    join(process.cwd(), "app/(admin)/dashboard/finance/actuals/page.tsx"),
    "utf8",
  );

  it("23–25 Sep–Okt, Q1, and URL persistence unchanged", () => {
    expect(slicer).toContain("resolveNextMonthRangeSelection");
    expect(actualsPage).toContain("parseFinanceMeasurementPeriodFromSearchParams");
    expect(actualsPanel).toContain("FinanceQuarterPeriodSlicer");
    expect(actualsPanel).toContain("periodStartIndex");
  });

  it("26 no sub-year budget variance columns", () => {
    expect(actualsPanel).not.toMatch(/\/\s*12/);
    expect(actualsPanel).not.toMatch(/favorabilityColumn[\s\S]*comparisonMode === "MONTH"/);
  });

  it("27 FinanceYear.name remains verbatim via selectedYearName", () => {
    expect(actualsPanel).toContain("selectedYearName");
    expect(actualsPanel).toContain("summaryTitleWithPeriodAndYear");
  });

  it("28 exactly one Ist-Wert erfassen action", () => {
    expect(actualsPanel.match(/data-finance-actual-create/g)?.length).toBe(1);
  });
});
