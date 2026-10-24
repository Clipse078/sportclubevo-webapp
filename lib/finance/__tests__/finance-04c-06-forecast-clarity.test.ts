import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  enrichForecastBudgetComparisonDrivers,
  isForecastComparisonMovementNeutral,
} from "@/lib/finance/forecast/forecast-clarity-presentation";
import {
  buildForecastHistoryExpandedEntryLine,
} from "@/lib/finance/forecast/forecast-revision-presentation";
import {
  FORECAST_REVISION_REASONS,
  FORECAST_REVISION_REASON_PRESENTATION,
} from "@/lib/finance/forecast/forecast-revision-reason";
import {
  parseFormalReforecastRevisionReasonInput,
  validateFormalReforecastRevisionContext,
} from "@/lib/finance/forecast/forecast-revision-metadata-validation";
import { buildFormalReforecastPreviewInputKey } from "@/lib/finance/forecast/formal-reforecast-preview-lifecycle";
import { deriveProjectionManagementConclusion } from "@/lib/finance/projection/projection-management-conclusion";
import {
  ROLLING_FORECAST_FIN_04C_06_CLARITY_PRINCIPLES,
  ROLLING_FORECAST_FIN_04C_06_REFORECAST_CONTEXT,
} from "@/lib/finance/forecast/rolling-forecast-architecture-contract";

const rolling = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastRollingUxSections.tsx"),
  "utf8",
);
const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastWorkspacePanel.tsx"),
  "utf8",
);
const projection = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceProjectionWorkspaceSection.tsx"),
  "utf8",
);
const disclosure = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceWorkspaceDisclosure.tsx"),
  "utf8",
);
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");
const migrationSql = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20261024140000_sce_finance_04c_06_revision_reason/migration.sql",
  ),
  "utf8",
);

describe("FIN-04C-06 forecast clarity & reforecast context", () => {
  it("documents locked clarity principles in architecture contract", () => {
    expect(ROLLING_FORECAST_FIN_04C_06_CLARITY_PRINCIPLES.progressiveDisclosure).toContain(
      "progressive disclosure",
    );
    expect(ROLLING_FORECAST_FIN_04C_06_REFORECAST_CONTEXT.revisionReasonOptional).toBe(true);
  });

  it("uses result-first current forecast header without equal KPI strip", () => {
    expect(rolling).toContain("clarity.expectedResultLabel");
    expect(rolling).toContain('data-finance-forecast-summary="result"');
    expect(rolling).toContain("text-2xl font-semibold");
    expect(rolling).toContain("clarity.incomeExpenseComposition");
    expect(rolling).toContain("data-finance-budget-context-line");
  });

  it("semantic zero-change hides movement triple and driver bars", () => {
    expect(isForecastComparisonMovementNeutral({
      incomeDeltaMinor: 0,
      expenseDeltaMinor: 0,
      resultDeltaMinor: 0,
    })).toBe(true);
    expect(rolling).toContain("data-finance-zero-change-quiet");
    expect(rolling).toContain("clarity.noChangeSincePrevious");
    expect(rolling).not.toContain("CompactMovementSummary");
    expect(de).toContain("Keine Änderungen seit der letzten Prognose");
  });

  it("non-zero change leads with result movement and bounded drivers", () => {
    expect(rolling).toContain("clarity.changeResultSincePrevious");
    expect(rolling).toContain("selectMeaningfulForecastChangeDrivers");
  });

  it("collapses prognoseverlauf by default with accessible disclosure", () => {
    expect(rolling).toContain("FinanceWorkspaceDisclosure");
    expect(rolling).toContain('data-finance-disclosure="prognoseverlauf"');
    expect(disclosure).toContain("aria-expanded");
    expect(disclosure).toContain("type=\"button\"");
  });

  it("budget comparison is driver-first with favourability enrichment", () => {
    expect(rolling).toContain("enrichForecastBudgetComparisonDrivers");
    expect(rolling).toContain("clarity.budgetTopDriversTitle");
    expect(
      enrichForecastBudgetComparisonDrivers([
        {
          financialAccountId: "a1",
          accountName: "Mitgliedsbeiträge",
          accountType: "INCOME",
          baseAmountMinor: 100_00,
          comparisonAmountMinor: 150_00,
          baseLinePresent: true,
          comparisonLinePresent: true,
          deltaMinor: 50_00,
          changeKind: "INCREASED",
        },
      ])[0]?.favorability,
    ).toBe("FAVORABLE");
  });

  it("account tables sit behind progressive disclosure", () => {
    expect(panel).toContain('data-finance-disclosure="forecast-accounts"');
    expect(panel).toContain("clarity.accountsShowAll");
  });

  it("automatic forecast leads with management conclusion and collapses details", () => {
    expect(projection).toContain("deriveProjectionManagementConclusion");
    expect(projection).toContain("clarityAlignedTitle");
    expect(projection).toContain("clarityReviewTitle");
    expect(projection).toContain('data-finance-disclosure="projection-details"');
    expect(projection).not.toMatch(/type="checkbox"/);
  });

  it("formal reforecast dialog keeps simple default and optional Weitere Angaben", () => {
    expect(rolling).toContain("data-finance-formal-reforecast-more-details-trigger");
    expect(rolling).toContain("formalReforecast.reasonLabel");
    expect(rolling).toContain("reduceFormalReforecastPreviewDialog");
    expect(rolling).not.toMatch(
      /setRevisionLabel\(e\.target\.value\)[\s\S]{0,120}requestPreview/,
    );
    expect(rolling).toContain("FORECAST_REVISION_REASON_PRESENTATION");
    expect(rolling).toContain("FORECAST_REVISION_REASONS.map");
  });

  it("revision reason persistence is additive and legacy-safe", () => {
    expect(migrationSql).toContain("FinanceForecastRevisionReason");
    expect(migrationSql).toContain("revisionReason");
    expect(migrationSql).not.toMatch(/UPDATE\s+"FinanceForecastVersion"/i);
    expect(() => parseFormalReforecastRevisionReasonInput("NOT_A_REASON")).toThrow();
    expect(
      validateFormalReforecastRevisionContext({
        revisionReason: "OTHER",
        revisionContext: "Sitzungsnotiz",
      }).revisionContext,
    ).toBe("Sitzungsnotiz");
    expect(
      buildForecastHistoryExpandedEntryLine({
        asOfDateDisplay: "24.10.2026",
        revisionReason: "PERIODIC_REVIEW",
        revisionContext: null,
        versionNumber: 3,
      }),
    ).toContain("Regelmässige Überprüfung");
  });

  it("preview input key includes actuals cutoff without label keystroke refresh", () => {
    expect(buildFormalReforecastPreviewInputKey("2026-10-24", "", "2026-10-20")).toBe(
      "2026-10-24::2026-10-20::",
    );
  });

  it("projection conclusion distinguishes aligned vs review", () => {
    const aligned = deriveProjectionManagementConclusion({
      coverage: {
        eligibleAccountCount: 5,
        projectedAccountCount: 3,
        missingProjectionCount: 2,
        coverageStatus: "PARTIAL",
        income: {
          projectedTotalMinor: 100,
          complete: true,
          consideredCount: 2,
          projectedCount: 2,
        },
        expense: {
          projectedTotalMinor: 50,
          complete: true,
          consideredCount: 3,
          projectedCount: 3,
        },
        result: { minor: 50, complete: true },
      },
      dashboard: {
        outlook: [
          {
            metric: "RESULT",
            actualMinor: 0,
            forecastMinor: 50,
            projectionMinor: 50,
            budgetMinor: null,
          },
        ],
        incomeComposition: [],
        expenseComposition: [],
        divergence: [],
        confidenceNote: null,
      },
      forecastResultMinor: 50,
    });
    expect(aligned?.kind).toBe("ALIGNED");
  });
});
