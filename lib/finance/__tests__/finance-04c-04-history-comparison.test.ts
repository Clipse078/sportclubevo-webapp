import { beforeEach, describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { AUTOMATIC_FORECAST_COMPARISON_BOUNDARY } from "@/lib/finance/forecast/forecast-history-read-model";
import { resolvePreviousForecastVersionId } from "@/lib/finance/forecast/forecast-history-lineage";
import {
  sortForecastHistoryChronological,
  sortForecastHistoryForDisplay,
} from "@/lib/finance/forecast/forecast-history-ordering";
import {
  buildForecastHistoryDisplayMetadata,
  resolveForecastRevisionSourcePresentationLabel,
} from "@/lib/finance/forecast/forecast-revision-presentation";
import {
  computeFinanceForecastAccountComparisons,
  computeFinanceForecastVersionComparisonSummary,
  sortForecastAccountComparisonsByLargestChange,
} from "@/lib/finance/forecast/forecast-revision-comparison";
import { ROLLING_FORECAST_FIN_04C_04_HISTORY_COMPARISON } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import { formalizeCurrentForecast } from "@/lib/finance/services/finance-forecast-formal-reforecast-service";
import {
  compareFinanceForecastVersions,
  getCurrentForecastVsApprovedBudget,
  getCurrentForecastVsPrevious,
  loadFinanceForecastHistory,
  resolveForecastActualComparisonBoundary,
} from "@/lib/finance/services/finance-forecast-history-query-service";
import {
  baseRevisionStore,
  emptyRevisionDbQueryCounts,
  makeRevisionDb,
  revisionMockCtx,
  revisionMockTenantA,
  revisionMockTenantB,
  revisionMockYearId,
  type RevisionStore,
} from "@/lib/finance/__tests__/finance-04c-revision-mock-db";

function seedMultiRevisionHistory(store: RevisionStore) {
  store.financeForecastVersion.push(
    {
      id: "fv-v1-superseded",
      forecastId: "forecast-1",
      status: "SUPERSEDED",
      versionNumber: 1,
      revisionSource: null,
      revisionLabel: null,
      createdAt: new Date("2026-01-10T10:00:00.000Z"),
    },
    {
      id: "fv-v2-superseded",
      forecastId: "forecast-1",
      status: "SUPERSEDED",
      versionNumber: 2,
      revisionSource: "MANUAL_REFORECAST",
      revisionLabel: "Frühjahrsreview",
      asOfDate: new Date("2026-04-30T00:00:00.000Z"),
      previousVersionId: "fv-v1-superseded",
      createdByUserId: "user-1",
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
    },
  );
  store.financeForecastLine.push(
    {
      id: "fl-v1-income",
      forecastVersionId: "fv-v1-superseded",
      financialAccountId: "acc-income",
      amountMinor: 150_00,
    },
    {
      id: "fl-v2-income",
      forecastVersionId: "fv-v2-superseded",
      financialAccountId: "acc-income",
      amountMinor: 158_00,
    },
  );
  store.financeForecastVersion[0] = {
    ...store.financeForecastVersion[0]!,
    status: "CURRENT",
    versionNumber: 3,
    revisionSource: "MANUAL_REFORECAST",
    revisionLabel: "Q3 Review",
    asOfDate: new Date("2026-09-30T00:00:00.000Z"),
    previousVersionId: "fv-v2-superseded",
    createdByUserId: "user-1",
  };
  store.financeForecast[0]!.currentVersionId = "fv-current";
  store.financeForecastLine[0]!.amountMinor = 172_00;
}

describe("FIN-04C-04 architecture locks", () => {
  it("documents history & comparison query facts", () => {
    expect(ROLLING_FORECAST_FIN_04C_04_HISTORY_COMPARISON.historyQueryService).toBe(
      "loadFinanceForecastHistory",
    );
    expect(ROLLING_FORECAST_FIN_04C_04_HISTORY_COMPARISON.comparisonDeltaComparisonMinusBase).toBe(
      true,
    );
    expect(AUTOMATIC_FORECAST_COMPARISON_BOUNDARY.includedInPrognoseverlauf).toBe(false);
  });
});

describe("FIN-04C-04 history read model", () => {
  let store: RevisionStore;

  beforeEach(() => {
    store = baseRevisionStore();
    seedMultiRevisionHistory(store);
  });

  it("returns current + historical versions with deterministic display order", async () => {
    const history = await loadFinanceForecastHistory(
      makeRevisionDb(store),
      revisionMockCtx(),
      revisionMockYearId,
    );
    expect(history).not.toBeNull();
    expect(history!.entries[0]!.isCurrent).toBe(true);
    expect(history!.entries[0]!.forecastVersionId).toBe("fv-current");
    expect(history!.entries.map((e) => e.versionNumber)).toEqual([3, 2, 1]);
    expect(history!.entriesChronological.map((e) => e.versionNumber)).toEqual([1, 2, 3]);
  });

  it("handles legacy null metadata and revision labels", async () => {
    const history = await loadFinanceForecastHistory(
      makeRevisionDb(store),
      revisionMockCtx(),
      revisionMockYearId,
    );
    const legacy = history!.entries.find((e) => e.versionNumber === 1)!;
    expect(legacy.revisionSource).toBeNull();
    expect(legacy.presentation.displayTitle).toBe("Frühere Prognose");
    expect(resolveForecastRevisionSourcePresentationLabel(null)).toBe("Prognose");

    const labeled = history!.entries.find((e) => e.revisionLabel === "Q3 Review")!;
    expect(labeled.presentation.displayTitle).toBe("Q3 Review");
    expect(labeled.actor?.displayName).toBe("Max Muster");
  });

  it("computes totals from stored version lines only", async () => {
    const history = await loadFinanceForecastHistory(
      makeRevisionDb(store),
      revisionMockCtx(),
      revisionMockYearId,
    );
    const current = history!.entries.find((e) => e.isCurrent)!;
    expect(current.totalIncomeMinor).toBe(172_00);
    expect(current.totalExpenseMinor).toBe(0);
    expect(current.resultMinor).toBe(172_00);

    const v2 = history!.entries.find((e) => e.versionNumber === 2)!;
    expect(v2.resultMinor).toBe(158_00);
  });

  it("excludes scenario versions from Prognoseverlauf", async () => {
    store.financeForecastVersion.push({
      id: "fv-scenario",
      forecastId: "forecast-1",
      status: "SUPERSEDED",
      versionNumber: 99,
      scenarioKey: "optimistic",
      revisionSource: "MANUAL_REFORECAST",
    });
    const history = await loadFinanceForecastHistory(
      makeRevisionDb(store),
      revisionMockCtx(),
      revisionMockYearId,
    );
    expect(history!.entries.some((e) => e.forecastVersionId === "fv-scenario")).toBe(false);
  });
});

describe("FIN-04C-04 current pointer & previous resolution", () => {
  let store: RevisionStore;

  beforeEach(() => {
    store = baseRevisionStore();
    seedMultiRevisionHistory(store);
  });

  it("uses currentVersionId as authoritative current", async () => {
    store.financeForecastVersion.push({
      id: "fv-decoy-higher-number",
      forecastId: "forecast-1",
      status: "SUPERSEDED",
      versionNumber: 999,
      revisionSource: null,
      createdAt: new Date("2026-12-01T10:00:00.000Z"),
    });
    const history = await loadFinanceForecastHistory(
      makeRevisionDb(store),
      revisionMockCtx(),
      revisionMockYearId,
    );
    expect(history!.currentForecastVersionId).toBe("fv-current");
    expect(history!.entries[0]!.forecastVersionId).toBe("fv-current");
  });

  it("resolves previous via previousVersionId and legacy fallback", () => {
    const versions = store.financeForecastVersion.map((v) => ({
      forecastVersionId: v.id,
      forecastId: v.forecastId,
      versionNumber: v.versionNumber,
      status: v.status,
      previousVersionId: v.previousVersionId ?? null,
      scenarioKey: v.scenarioKey ?? null,
    }));
    const current = versions.find((v) => v.forecastVersionId === "fv-current")!;
    expect(resolvePreviousForecastVersionId(current, versions)).toBe("fv-v2-superseded");

    const legacyCurrent = { ...current, previousVersionId: null };
    expect(resolvePreviousForecastVersionId(legacyCurrent, versions)).toBe("fv-v2-superseded");
  });

  it("returns NO_PREVIOUS_FORECAST when no predecessor exists", async () => {
    store = baseRevisionStore();
    const result = await getCurrentForecastVsPrevious(
      makeRevisionDb(store),
      revisionMockCtx(),
      revisionMockYearId,
    );
    expect(result.kind).toBe("NO_PREVIOUS_FORECAST");
  });

  it("compares previous (base) vs current (comparison)", async () => {
    const result = await getCurrentForecastVsPrevious(
      makeRevisionDb(store),
      revisionMockCtx(),
      revisionMockYearId,
    );
    expect(result.kind).toBe("COMPARISON");
    if (result.kind !== "COMPARISON") return;
    expect(result.comparison.base.forecastVersionId).toBe("fv-v2-superseded");
    expect(result.comparison.comparison.forecastVersionId).toBe("fv-current");
    expect(result.comparison.summary.incomeDeltaMinor).toBe(172_00 - 158_00);
  });
});

describe("FIN-04C-04 version & account comparison", () => {
  it("computes neutral income/expense/result deltas", () => {
    const summary = computeFinanceForecastVersionComparisonSummary({
      baseLines: [
        { financialAccountId: "i", amountMinor: 100_00, accountType: "INCOME" },
        { financialAccountId: "e", amountMinor: 40_00, accountType: "EXPENSE" },
      ],
      comparisonLines: [
        { financialAccountId: "i", amountMinor: 120_00, accountType: "INCOME" },
        { financialAccountId: "e", amountMinor: 50_00, accountType: "EXPENSE" },
      ],
    });
    expect(summary.resultDeltaMinor).toBe(summary.comparisonResultMinor - summary.baseResultMinor);
    expect(summary.resultDeltaMinor).toBe(70_00 - 60_00);
  });

  it("classifies added/removed/increased/unchanged with zero vs absence", () => {
    const rows = computeFinanceForecastAccountComparisons({
      baseLines: new Map([
        ["a", 0],
        ["b", 10_00],
      ]),
      comparisonLines: new Map([
        ["a", 0],
        ["c", 10_00],
      ]),
      accountTypes: new Map([
        ["a", "EXPENSE"],
        ["b", "EXPENSE"],
        ["c", "EXPENSE"],
      ]),
      accountOrder: ["a", "b", "c"],
    });
    expect(rows.find((r) => r.financialAccountId === "a")!.changeKind).toBe("UNCHANGED");
    expect(rows.find((r) => r.financialAccountId === "b")!.changeKind).toBe("REMOVED");
    expect(rows.find((r) => r.financialAccountId === "c")!.changeKind).toBe("ADDED");
  });

  it("ranks largest absolute changes with stable tie order", () => {
    const rows = computeFinanceForecastAccountComparisons({
      baseLines: new Map([
        ["acc-income", 100_00],
        ["acc-expense", 10_00],
      ]),
      comparisonLines: new Map([
        ["acc-income", 130_00],
        ["acc-expense", 10_00],
      ]),
      accountTypes: new Map([
        ["acc-income", "INCOME"],
        ["acc-expense", "EXPENSE"],
      ]),
      accountOrder: ["acc-income", "acc-expense"],
    });
    const ranked = sortForecastAccountComparisonsByLargestChange(rows, [
      "acc-income",
      "acc-expense",
    ]);
    expect(ranked[0]!.financialAccountId).toBe("acc-income");
    expect(Math.abs(ranked[0]!.deltaMinor)).toBeGreaterThan(0);
  });
});

describe("FIN-04C-04 budget & boundaries", () => {
  let store: RevisionStore;

  beforeEach(() => {
    store = baseRevisionStore();
    seedMultiRevisionHistory(store);
  });

  it("returns NO_APPROVED_BUDGET without draft fallback", async () => {
    store.financeBudget.push({
      id: "budget-1",
      tenantId: revisionMockTenantA,
      financeYearId: revisionMockYearId,
      currentBaselineVersionId: null,
    });
    store.financeBudgetVersion.push({
      id: "bv-draft",
      budgetId: "budget-1",
      status: "DRAFT",
      versionNumber: 1,
    });
    const result = await getCurrentForecastVsApprovedBudget(
      makeRevisionDb(store),
      revisionMockCtx({ permissionKeys: new Set(["finance.forecast.view"]) }),
      revisionMockYearId,
    );
    expect(result.kind).toBe("NO_APPROVED_BUDGET");
  });

  it("compares approved budget (base) vs current forecast (comparison)", async () => {
    store.financeBudget.push({
      id: "budget-1",
      tenantId: revisionMockTenantA,
      financeYearId: revisionMockYearId,
      currentBaselineVersionId: "bv-approved",
    });
    store.financeBudgetVersion.push({
      id: "bv-approved",
      budgetId: "budget-1",
      status: "APPROVED",
      versionNumber: 1,
    });
    store.financeBudgetLine.push(
      {
        id: "bl-1",
        budgetVersionId: "bv-approved",
        financialAccountId: "acc-income",
        amountMinor: 160_00,
      },
      {
        id: "bl-2",
        budgetVersionId: "bv-approved",
        financialAccountId: "acc-expense",
        amountMinor: 5_00,
      },
    );

    const result = await getCurrentForecastVsApprovedBudget(
      makeRevisionDb(store),
      revisionMockCtx({ permissionKeys: new Set(["finance.forecast.view"]) }),
      revisionMockYearId,
    );
    expect(result.kind).toBe("COMPARISON");
    if (result.kind !== "COMPARISON") return;
    expect(result.comparison.base.kind).toBe("APPROVED_BUDGET");
    expect(result.comparison.summary.incomeDeltaMinor).toBe(172_00 - 160_00);
    expect(result.comparison.currencyCode).toBe("CHF");
  });

  it("does not expose misleading forecast minus actual comparison", () => {
    const boundary = resolveForecastActualComparisonBoundary({
      actualYtdMinor: 50_00,
      annualForecastMinor: 200_00,
    });
    expect(boundary.mayComputeMisleadingForecastMinusActual).toBe(false);
    expect(boundary.presentationPolicy.rawDeltaMinor).toBeNull();
  });
});

describe("FIN-04C-04 isolation & lineage", () => {
  it("rejects cross-tenant version comparison as not found", async () => {
    const store = baseRevisionStore();
    seedMultiRevisionHistory(store);
    await expect(
      compareFinanceForecastVersions(
        makeRevisionDb(store),
        revisionMockCtx({ tenantId: revisionMockTenantB }),
        {
          financeYearId: revisionMockYearId,
          baseVersionId: "fv-v2-superseded",
          comparisonVersionId: "fv-current",
        },
      ),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });

  it("detects malformed lineage without throwing history load", async () => {
    const store = baseRevisionStore();
    store.financeForecastVersion[0]!.previousVersionId = "fv-current";
    const history = await loadFinanceForecastHistory(
      makeRevisionDb(store),
      revisionMockCtx(),
      revisionMockYearId,
    );
    expect(history!.lineageDiagnostics.some((d) => d.kind === "SELF_REFERENCE")).toBe(true);
  });

  it("uses bounded batched queries for history load", async () => {
    const store = baseRevisionStore();
    seedMultiRevisionHistory(store);
    const counts = emptyRevisionDbQueryCounts();
    await loadFinanceForecastHistory(
      makeRevisionDb(store, counts),
      revisionMockCtx(),
      revisionMockYearId,
    );
    expect(counts.financeForecastVersionFindMany).toBe(1);
    expect(counts.financeForecastLineFindMany).toBe(1);
    expect(counts.financialAccountFindMany).toBe(1);
  });
});

describe("FIN-04C-04 presentation ordering helpers", () => {
  it("sorts display and chronological orders by versionNumber", () => {
    const entries = [
      { forecastVersionId: "a", versionNumber: 1, status: "SUPERSEDED" as const },
      { forecastVersionId: "b", versionNumber: 3, status: "CURRENT" as const },
      { forecastVersionId: "c", versionNumber: 2, status: "SUPERSEDED" as const },
    ];
    expect(sortForecastHistoryForDisplay(entries).map((e) => e.versionNumber)).toEqual([3, 2, 1]);
    expect(sortForecastHistoryChronological(entries).map((e) => e.versionNumber)).toEqual([
      1, 2, 3,
    ]);
  });

  it("applies display title precedence", () => {
    const fromLabel = buildForecastHistoryDisplayMetadata({
      revisionLabel: "Q3 Review",
      revisionSource: "MANUAL_REFORECAST",
      asOfDate: new Date("2026-09-30T00:00:00.000Z"),
      versionNumber: 3,
      isCurrent: true,
    });
    expect(fromLabel.displayTitle).toBe("Q3 Review");
    expect(fromLabel.displaySubtitle).toContain("Version 3");
  });
});

describe("FIN-04C-03 regression via history after formalization", () => {
  it("builds history after formal reforecast", async () => {
    const store = baseRevisionStore();
    const db = makeRevisionDb(store);
    await formalizeCurrentForecast(db, revisionMockCtx(), {
      financeYearId: revisionMockYearId,
      expectedCurrentForecastVersionId: "fv-current",
      asOfDate: "2026-06-30",
      revisionLabel: "Halbjahr",
    });
    const history = await loadFinanceForecastHistory(db, revisionMockCtx(), revisionMockYearId);
    expect(history!.entries.length).toBeGreaterThanOrEqual(2);
    expect(history!.entries.some((e) => e.status === "SUPERSEDED")).toBe(true);
  });
});
