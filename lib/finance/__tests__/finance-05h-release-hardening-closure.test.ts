import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { YTD_BUDGET_VARIANCE_SUPPORTED } from "@/lib/finance/actual/period-semantics";
import {
  computeSemanticVarianceMetrics,
  computeVariancePercent,
} from "@/lib/finance/actual/variance-semantics";
import { buildFinanceOverviewDecisionIntelligenceReadModel } from "@/lib/finance/reporting/build-finance-overview-decision-intelligence-read-model";
import { buildFinanceComparativeIntelligenceReadModel } from "@/lib/finance/reporting/build-finance-comparative-intelligence-read-model";
import { buildFinanceManagementOverviewReadModel } from "@/lib/finance/reporting/build-finance-management-overview-read-model";
import { buildFinanceManagementPnlReadModel } from "@/lib/finance/reporting/build-finance-management-pnl-read-model";
import {
  FINANCE_EXPECTED_MOVEMENT_VISUALIZATION_PRINCIPLE,
  FINANCE_VISUAL_BENCHMARK,
  FINANCE_05H_IMPLEMENTATION,
  SCE_FINANCE_09_LIQUIDITY_VISUAL_DESIGN_NOTE,
  SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS,
  SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS,
  FINANCE_REPORTING_PERIOD_SEMANTICS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";
import { FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID } from "@/lib/finance/reporting/pnl-reporting-completeness";
import {
  FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE,
  loadFinanceManagementReportingDetailReadModel,
} from "@/lib/finance/services/finance-management-reporting-query-service";
import { FINANCE_OVERVIEW_DECISION_INTELLIGENCE_QUERY_SHAPE } from "@/lib/finance/services/finance-overview-decision-intelligence-query-service";

const tenantA = "tenant-a";
const userId = "user-1";

function ctx(permissions: string[]) {
  return { tenantId: tenantA, userId, permissionKeys: new Set(permissions) };
}

function baseGroup(id: string) {
  return {
    id,
    tenantId: tenantA,
    name: "Income group",
    parentId: null,
    sortOrder: 0,
    lifecycle: "ACTIVE" as const,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function baseAccount(id: string, semantic: "INCOME" | "EXPENSE", reportingGroupId = "g1") {
  return {
    id,
    tenantId: tenantA,
    reportingGroupId,
    name: id,
    sortOrder: 0,
    lifecycle: "ACTIVE" as const,
    archivedAt: null,
    canonicalSemantic: semantic,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

type SharedReportingInput = Parameters<typeof buildFinanceManagementPnlReadModel>[0];

function baseSharedReportingInput(
  overrides: Partial<SharedReportingInput> = {},
): SharedReportingInput {
  const accountId = "acc-income";
  return {
    tenantId: tenantA,
    financeYearId: "fy1",
    financeYearName: "FY2026",
    baseCurrency: "EUR",
    structureAvailability: "AVAILABLE" as const,
    actualCutoffDate: new Date("2026-10-25T12:00:00.000Z"),
    groups: [baseGroup("g1")],
    accounts: [
      baseAccount(accountId, "INCOME"),
      baseAccount("acc-expense", "EXPENSE"),
      baseAccount("acc-unassigned", "INCOME", "missing-group"),
    ],
    approvedMeasure: {
      budgetVersionId: "bv1",
      valuesByAccountId: new Map([
        [accountId, 150_000_00],
        ["acc-expense", 80_000_00],
        ["acc-unassigned", 20_000_00],
      ]),
    },
    actualMeasure: {
      grain: "YTD" as const,
      cutoffDate: new Date("2026-10-25T12:00:00.000Z"),
      valuesByAccountId: new Map([
        [accountId, 7_776_00],
        ["acc-expense", 40_000_00],
        ["acc-unassigned", 5_000_00],
      ]),
    },
    forecastMeasure: {
      forecastVersionId: "fv1",
      valuesByAccountId: new Map([
        [accountId, 161_533_00],
        ["acc-expense", 90_000_00],
        ["acc-unassigned", 22_000_00],
      ]),
    },
    sourceVisibility: {
      approvedBudget: true,
      actual: true,
      currentForecast: true,
    },
    ...overrides,
  };
}

function buildOverviewBundle(input: SharedReportingInput) {
  const management = buildFinanceManagementOverviewReadModel(input);
  const pnl = buildFinanceManagementPnlReadModel(input);
  const overview = buildFinanceOverviewDecisionIntelligenceReadModel({
    management,
    timingOverview: null,
    visualModel: null,
    timingVisible: false,
    capabilities: {
      canOpenReports: true,
      canOpenBudget: true,
      canOpenForecast: true,
      canOpenTiming: false,
      canOpenActuals: true,
      canOpenStructure: true,
    },
  });
  return { management, pnl, overview };
}

describe("FIN-05H release hardening & FIN-05 closure", () => {
  it("A — cross-workspace income, expense, and management result reconcile", () => {
    const { management, pnl } = buildOverviewBundle(baseSharedReportingInput());
    expect(management.approvedBudget.summary?.incomeMinor).toBe(
      pnl.reconciliation.approvedBudget.canonicalIncomeMinor,
    );
    expect(management.approvedBudget.summary?.expenseMinor).toBe(
      pnl.reconciliation.approvedBudget.canonicalExpenseMinor,
    );
    expect(management.approvedBudget.summary?.resultMinor).toBe(
      pnl.managementResult.approvedBudget.amountMinor,
    );
    expect(management.currentForecast.summary?.resultMinor).toBe(
      pnl.managementResult.currentForecast.amountMinor,
    );
    expect(management.actual.summary?.resultMinor).toBe(pnl.managementResult.actual.amountMinor);
    expect(pnl.reconciliation.approvedBudget.reconciles).toBe(true);
    expect(pnl.reconciliation.currentForecast.reconciles).toBe(true);
  });

  it("B — overview conclusion matches reporting comparative variance semantics", () => {
    const { pnl, overview } = buildOverviewBundle(baseSharedReportingInput());
    expect(overview.conclusion.forecastResultMinor).toBe(
      pnl.managementResult.currentForecast.amountMinor,
    );
    expect(overview.conclusion.approvedBudgetResultMinor).toBe(
      pnl.managementResult.approvedBudget.amountMinor,
    );
    expect(overview.conclusion.forecastVsBudgetVarianceMinor).toBe(
      pnl.managementResult.forecastVsBudget.rawDeltaMinor,
    );
    expect(overview.conclusion.forecastVsBudgetFavorability).toBe(
      pnl.managementResult.forecastVsBudget.favorability,
    );
    const comparative = buildFinanceComparativeIntelligenceReadModel(pnl);
    expect(comparative.overallComparison.variance.rawDeltaMinor).toBe(
      overview.conclusion.forecastVsBudgetVarianceMinor,
    );
  });

  it("C — variance reconciliation uses FIN-05B semantics (comparison - baseline)", () => {
    const metrics = computeSemanticVarianceMetrics({
      canonicalSemantic: "INCOME",
      baselineMinor: 100,
      comparisonMinor: 120,
    });
    expect(metrics.rawDeltaMinor).toBe(20);
    expect(metrics.favorability).toBe("FAVORABLE");
  });

  it("D/E — actual grain and cutoff are consistent across overview and P&L", () => {
    const cutoff = new Date("2026-10-25T08:00:00.000Z");
    const { management, pnl } = buildOverviewBundle(
      baseSharedReportingInput({
        actualCutoffDate: cutoff,
        actualMeasure: {
          grain: "YTD",
          cutoffDate: cutoff,
          valuesByAccountId: new Map([["acc-income", 1_00]]),
        },
      }),
    );
    expect(management.actual.grain).toBe("YTD");
    expect(management.actualCutoffDate?.toISOString()).toBe(cutoff.toISOString());
    expect(pnl.actualGrain).toBe("YTD");
    expect(pnl.actualCutoffDate?.toISOString()).toBe(cutoff.toISOString());
    expect(pnl.comparativeIntelligence.actualContext.cutoffDate?.toISOString()).toBe(
      cutoff.toISOString(),
    );
  });

  it("F — YTD actual vs annual budget remains context-only, not ordinary variance", () => {
    const { management, pnl } = buildOverviewBundle(baseSharedReportingInput());
    expect(YTD_BUDGET_VARIANCE_SUPPORTED).toBe(false);
    expect(management.actualVsBudgetVariance.availability).toBe("PERIOD_MISMATCH");
    expect(pnl.actualVsBudgetVariance.availability).toBe("PERIOD_MISMATCH");
  });

  it("G — unassigned accounts with values remain visible in P&L hierarchy", () => {
    const { pnl } = buildOverviewBundle(baseSharedReportingInput());
    expect(pnl.hasUnassignedFinancialValues).toBe(true);
    const residual = pnl.incomeSection.nodes.find((n) => n.kind === "unassigned_residual");
    expect(residual?.kind).toBe("unassigned_residual");
    if (residual?.kind === "unassigned_residual") {
      expect(residual.residualGroupId).toBe(FINANCE_PNL_UNASSIGNED_RESIDUAL_GROUP_ID);
    }
  });

  it("H — hierarchy reconciliation flags no double counting", () => {
    const { pnl } = buildOverviewBundle(baseSharedReportingInput());
    expect(pnl.reconciliation.approvedBudget.reconciles).toBe(true);
    expect(pnl.reconciliation.actual.reconciles).toBe(true);
    expect(pnl.reconciliation.currentForecast.reconciles).toBe(true);
  });

  it("I — missing forecast is not coerced to zero in management result", () => {
    const { pnl } = buildOverviewBundle(
      baseSharedReportingInput({
        forecastMeasure: null,
        sourceVisibility: { approvedBudget: true, actual: true, currentForecast: true },
      }),
    );
    expect(pnl.managementResult.currentForecast.availability).toBe("NO_CURRENT_FORECAST");
    expect(pnl.managementResult.currentForecast.amountMinor).toBeNull();
  });

  it("J — restricted forecast visibility masks values (restricted ≠ zero)", () => {
    const { pnl, overview } = buildOverviewBundle(
      baseSharedReportingInput({
        forecastMeasure: null,
        sourceVisibility: { approvedBudget: true, actual: true, currentForecast: false },
      }),
    );
    expect(pnl.managementResult.currentForecast.availability).toBe("NOT_VISIBLE");
    expect(pnl.managementResult.currentForecast.amountMinor).toBeNull();
    expect(overview.conclusion.kind).toBe("NO_CONCLUSION");
    expect(overview.conclusion.forecastResultMinor).toBeNull();
  });

  it("K — zero baseline keeps percentage variance unavailable", () => {
    expect(computeVariancePercent(50, 0)).toBeNull();
  });

  it("L/M/N — empty and partial-data states surface explicit availability", () => {
    const noBudget = buildOverviewBundle(
      baseSharedReportingInput({ approvedMeasure: null, forecastMeasure: null }),
    );
    expect(noBudget.pnl.comparativeIntelligence.sourceAvailability.approvedBudget).toBe(
      "NO_APPROVED_BUDGET",
    );
    expect(noBudget.overview.conclusion.kind).toBe("FORECAST_UNAVAILABLE");

    const noStructure = buildFinanceManagementPnlReadModel(
      baseSharedReportingInput({ structureAvailability: "NO_STRUCTURE" }),
    );
    expect(noStructure.availability).toBe("NO_STRUCTURE");
  });

  it("O — overview without timing leaves expected movement in no-timing state", () => {
    const { overview } = buildOverviewBundle(baseSharedReportingInput());
    expect(overview.expectedMovement.availability).toBe("NOT_VISIBLE");
  });

  it("P — no driver state still composes overview without fabrication", () => {
    const { overview } = buildOverviewBundle(
      baseSharedReportingInput({
        approvedMeasure: {
          budgetVersionId: "bv1",
          valuesByAccountId: new Map([
            ["acc-income", 100_00],
            ["acc-expense", 100_00],
            ["acc-unassigned", 0],
          ]),
        },
        forecastMeasure: {
          forecastVersionId: "fv1",
          valuesByAccountId: new Map([
            ["acc-income", 100_00],
            ["acc-expense", 100_00],
            ["acc-unassigned", 0],
          ]),
        },
      }),
    );
    expect(overview.conclusion.kind).toBe("ON_TRACK");
    expect(
      overview.attentionItems.some((i) => i.kind === "UNFAVORABLE_FORECAST_VS_BUDGET"),
    ).toBe(false);
  });

  it("Q — tenant isolation rejects foreign account drill-down without evidence query", async () => {
    const db = {
      financeYear: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "fy1",
            tenantId: tenantA,
            name: "FY2026",
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-12-31"),
          },
        ]),
      },
      financeConfiguration: {
        findUnique: vi.fn().mockResolvedValue({
          tenantId: tenantA,
          baseCurrency: "EUR",
          currentFinanceYearId: "fy1",
        }),
      },
      financeBudget: { findUnique: vi.fn().mockResolvedValue(null) },
      financeForecast: { findUnique: vi.fn().mockResolvedValue(null) },
      financeActualEntry: { findMany: vi.fn().mockResolvedValue([]) },
      financialReportingGroup: { findMany: vi.fn().mockResolvedValue([]) },
      financialAccount: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "acc-i",
            tenantId: tenantA,
            name: "Membership",
            reportingGroupId: "g1",
            sortOrder: 0,
            lifecycle: "ACTIVE",
            archivedAt: null,
            canonicalSemantic: "INCOME",
          },
        ]),
      },
    };
    const model = await loadFinanceManagementReportingDetailReadModel(
      db as never,
      ctx([PERMISSIONS.FINANCE_VIEW]),
      {
        financeYearId: "fy1",
        accountId: "foreign-account",
        groupId: null,
        timingNavEnabled: false,
      },
    );
    expect(model.availability).toBe("NOT_FOUND");
    expect(db.financeActualEntry.findMany).not.toHaveBeenCalled();
  });

  it("R — navigation aliases redirect reporting shallow paths canonically", () => {
    const aliasPage = readFileSync(
      join(process.cwd(), "app/(admin)/dashboard/finance/income_statement/page.tsx"),
      "utf8",
    );
    expect(aliasPage).toContain('redirect("/dashboard/finance/reports")');
    const tabConfig = readFileSync(
      join(process.cwd(), "lib/finance/finance-tab-config.ts"),
      "utf8",
    );
    expect(tabConfig).toContain('reporting: "/dashboard/finance/reports"');
    expect(tabConfig).toContain('overview: "/dashboard/finance"');
  });

  it("S — DE/EN finance reporting keys exist (no raw key leakage contract)", () => {
    const en = readFileSync(join(process.cwd(), "messages/en.json"), "utf8");
    const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");
    for (const key of [
      "budgetedResult",
      "expectedResult",
      "varianceVsBudget",
      "favorabilityOnPlan",
    ]) {
      expect(en).toContain(`"${key}"`);
      expect(de).toContain(`"${key}"`);
    }
  });

  it("T — reporting modules avoid hardcoded CHF and Date.now financial authority", () => {
    const queryService = readFileSync(
      join(process.cwd(), "lib/finance/services/finance-management-reporting-query-service.ts"),
      "utf8",
    );
    expect(queryService).not.toContain("Date.now(");
    expect(queryService).not.toMatch(/\bCHF\b/);
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noHardcodedCurrency).toBe(true);
  });

  it("U — responsive architecture markers remain on overview and reporting roots", () => {
    const pnlPanel = readFileSync(
      join(process.cwd(), "components/admin/finance/reporting/FinanceManagementPnlPanel.tsx"),
      "utf8",
    );
    const overviewPanel = readFileSync(
      join(process.cwd(), "components/admin/finance/FinanceOverviewPanel.tsx"),
      "utf8",
    );
    expect(pnlPanel).toContain("data-finance-responsive-root");
    expect(overviewPanel).toContain("data-finance-responsive-root");
  });

  it("V — accessibility: favourability text markers remain (not color-only)", () => {
    const pnlPanel = readFileSync(
      join(process.cwd(), "components/admin/finance/reporting/FinanceManagementPnlPanel.tsx"),
      "utf8",
    );
    expect(pnlPanel).toContain("data-finance-variance-favorability");
    expect(pnlPanel).toContain("favorabilityText");
  });

  it("W — no fake monthly phasing flags remain locked", () => {
    expect(FINANCE_REPORTING_PERIOD_SEMANTICS.fakeMonthlyBudgetFromAnnualDivideBy12Forbidden).toBe(
      true,
    );
    expect(
      FINANCE_REPORTING_PERIOD_SEMANTICS.fakeMonthlyForecastFromAnnualDivideBy12Forbidden,
    ).toBe(true);
  });

  it("X — expected events remain distinct from liquidity; FIN-09 boundary documented", () => {
    expect(SCE_FINANCE_09_LIQUIDITY_VISUAL_DESIGN_NOTE.expectedEventTimelineIsNotLiquidity).toBe(
      true,
    );
    expect(SCE_FINANCE_09_LIQUIDITY_VISUAL_DESIGN_NOTE.implementedInFin05d).toBe(false);
    const timeline = readFileSync(
      join(
        process.cwd(),
        "components/admin/finance/overview/FinanceOverviewExpectedEventTimeline.tsx",
      ),
      "utf8",
    );
    expect(timeline).not.toMatch(/recharts|LineChart/i);
  });

  it("Y — refined visualization principle allows future movement profile without locking timeline-only", () => {
    expect(FINANCE_EXPECTED_MOVEMENT_VISUALIZATION_PRINCIPLE.timelineNotExclusiveFutureEvolution).toBe(
      true,
    );
    expect(
      FINANCE_EXPECTED_MOVEMENT_VISUALIZATION_PRINCIPLE.discreteExpectedMovements.allowedForms,
    ).toContain("PERIOD_MOVEMENT_PROFILE");
    expect(
      FINANCE_EXPECTED_MOVEMENT_VISUALIZATION_PRINCIPLE.discreteExpectedMovements.forbiddenImplications,
    ).toContain("IMPLY_RUNNING_BALANCE");
    expect(FINANCE_EXPECTED_MOVEMENT_VISUALIZATION_PRINCIPLE.expectedFinancialMovementsQuestion).toBe(
      "What financial movements are expected, and when?",
    );
    expect(FINANCE_EXPECTED_MOVEMENT_VISUALIZATION_PRINCIPLE.doNotConnectEventsWithLine).toBe(true);
    expect(
      FINANCE_EXPECTED_MOVEMENT_VISUALIZATION_PRINCIPLE.doNotPresentEventTimelineAsLiquidity,
    ).toBe(true);
  });

  it("Y2 — FINANCE_VISUAL_BENCHMARK documents Szenarien/Zeitplanung design grammar for FIN-06+", () => {
    expect(FINANCE_VISUAL_BENCHMARK.referenceWorkspaces).toEqual(["SCENARIOS", "ZEITPLANUNG"]);
    expect(FINANCE_VISUAL_BENCHMARK.designGrammarNotUniversalPageTemplate).toBe(true);
    expect(FINANCE_VISUAL_BENCHMARK.fin05hRedesignForbidden).toBe(true);
    expect(SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS.financeVisualBenchmarkDocumented).toBe(true);
  });

  it("Z — management P&L is not statutory accounting; reporting is not source of truth", () => {
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.managementPnlIsNotStatutoryAccounting).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.reportingIsNotSourceOfTruth).toBe(true);
    expect(SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS.overviewIsNotSourceOfTruth).toBe(true);
  });

  it("AA — no FIN-06 / FIN-09 / FIN-11 implementation drift in FIN-05H scope", () => {
    expect(SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS.publicationDeferredToFin06).toBe(true);
    expect(SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS.liquidityDeferredToFin09).toBe(true);
    expect(SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS.balanceSheetDeferredToFin11).toBe(true);
    expect(SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS.noGenericBiEngine).toBe(true);
  });

  it("AB — query shapes document shared loaders without per-account loops", () => {
    expect(FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE.perAccountQueryLoopForbidden).toBe(true);
    expect(FINANCE_MANAGEMENT_REPORTING_QUERY_SHAPE.measureLoads).toBe(3);
    expect(FINANCE_OVERVIEW_DECISION_INTELLIGENCE_QUERY_SHAPE.reusesManagementOverviewLoader).toBe(
      true,
    );
    expect(
      SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS.overviewAndReportingConsumeSharedMeasureLoader,
    ).toBe(true);
  });

  it("AC — FIN-05H implementation locks and documentation paths are registered", () => {
    expect(FINANCE_05H_IMPLEMENTATION.fin05hStatus).toBe("COMPLETE_PO_UAT_PASS");
    expect(FINANCE_05H_IMPLEMENTATION.fin05ProgrammeStatus).toBe("COMPLETE_RELEASE_CLOSED");
    expect(FINANCE_05H_IMPLEMENTATION.fin06Status).toBe("NOT_STARTED");
    const doc = readFileSync(
      join(process.cwd(), FINANCE_05H_IMPLEMENTATION.releaseHardeningDoc),
      "utf8",
    );
    expect(doc).toContain("FIN-05H");
    expect(doc).toContain("audit matrix");
  });

  it("AD — no new binary checkbox controls in finance reporting surfaces", () => {
    const reportingFiles = [
      "components/admin/finance/reporting/FinanceManagementPnlPanel.tsx",
      "components/admin/finance/reporting/FinanceReportingInvestigationWorkspace.tsx",
      "components/admin/finance/FinanceOverviewPanel.tsx",
    ];
    for (const file of reportingFiles) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toContain('type="checkbox"');
    }
  });
});
