import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  FINANCE_SCENARIO_FIN_04D_04_QUERY,
  FINANCE_SCENARIO_TOP_DRIVERS_DEFAULT_LIMIT,
} from "@/lib/finance/forecast/finance-scenario-read-model";
import { SCENARIO_QUERY_LAYER } from "@/lib/finance/forecast/scenario-architecture-contract";
import {
  archiveFinanceScenario,
  createFinanceScenario,
  upsertFinanceScenarioAssumption,
} from "@/lib/finance/services/finance-scenario-service";
import {
  loadFinanceScenarioDetail,
  loadFinanceScenarioList,
} from "@/lib/finance/services/finance-scenario-query-service";
import {
  createEmptyScenarioStore,
  makeScenarioDb,
  scenarioCtx,
  scenarioTenantB,
  scenarioYearId,
  seedApprovedBudget,
  seedCurrentForecast,
  type ScenarioDbQueryCounts,
  type ScenarioStore,
} from "@/lib/finance/__tests__/finance-04d-02-scenario-mock-db";

describe("FIN-04D-04 architecture locks", () => {
  it("documents query layer anchors and deferred scenario-to-scenario", () => {
    expect(SCENARIO_QUERY_LAYER.listQuery).toBe("loadFinanceScenarioList");
    expect(SCENARIO_QUERY_LAYER.detailQuery).toBe("loadFinanceScenarioDetail");
    expect(SCENARIO_QUERY_LAYER.scenarioToScenarioComparisonV1).toBe("DEFERRED");
    expect(FINANCE_SCENARIO_FIN_04D_04_QUERY.automaticForecastComparisonDefault).toBe(false);
  });
});

describe("FIN-04D-04 scenario list read model", () => {
  let store: ScenarioStore;

  beforeEach(() => {
    store = createEmptyScenarioStore();
    seedCurrentForecast(store, [
      { financialAccountId: "acc-income", amountMinor: 1_000_000 },
      { financialAccountId: "acc-expense", amountMinor: 400_000 },
    ]);
  });

  it("returns active scenarios only by default with stable ordering and totals", async () => {
    const db = makeScenarioDb(store);
    const first = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Alpha",
      expectedCurrentForecastVersionId: "fv-v1",
    });
    await upsertFinanceScenarioAssumption(db, scenarioCtx(), {
      scenarioId: first.scenarioId,
      expectedUpdatedAt: first.updatedAt,
      financialAccountId: "acc-income",
      assumption: { kind: "PERCENT_CHANGE", percentBasisPoints: -1000 },
    });
    const second = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Beta",
      expectedCurrentForecastVersionId: "fv-v1",
    });
    await archiveFinanceScenario(db, scenarioCtx(), {
      scenarioId: second.scenarioId,
      expectedUpdatedAt: second.updatedAt,
    });

    const list = await loadFinanceScenarioList(db, scenarioCtx(), scenarioYearId);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]!.scenarioId).toBe(first.scenarioId);
    expect(list.items[0]!.assumptionCount).toBe(1);
    expect(list.items[0]!.baselineResultMinor).toBe(600_000);
    expect(list.items[0]!.scenarioResultMinor).toBe(500_000);
    expect(list.items[0]!.resultDeltaMinor).toBe(-100_000);
    expect(list.items[0]!.baselineFreshness.status).toBe("CURRENT");
    expect(list.items[0]!.summaryState).toBe("RESULT_CHANGED");
  });

  it("includes archived scenarios when explicitly requested", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Archived case",
      expectedCurrentForecastVersionId: "fv-v1",
    });
    await archiveFinanceScenario(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: created.updatedAt,
    });
    const activeOnly = await loadFinanceScenarioList(db, scenarioCtx(), scenarioYearId);
    expect(activeOnly.items).toHaveLength(0);
    const withArchived = await loadFinanceScenarioList(db, scenarioCtx(), scenarioYearId, {
      includeArchived: true,
    });
    expect(withArchived.items).toHaveLength(1);
    expect(withArchived.items[0]!.isArchived).toBe(true);
  });

  it("avoids per-scenario baseline/assumption query fan-out", async () => {
    const counts: ScenarioDbQueryCounts = {
      financeScenarioFindMany: 0,
      financeScenarioBaselineLineFindMany: 0,
      financeScenarioAssumptionFindMany: 0,
    };
    const db = makeScenarioDb(store, { counts });
    for (let i = 0; i < 3; i += 1) {
      await createFinanceScenario(db, scenarioCtx(), {
        financeYearId: scenarioYearId,
        name: `Scenario ${i}`,
        expectedCurrentForecastVersionId: "fv-v1",
      });
    }
    counts.financeScenarioFindMany = 0;
    counts.financeScenarioBaselineLineFindMany = 0;
    counts.financeScenarioAssumptionFindMany = 0;
    await loadFinanceScenarioList(db, scenarioCtx(), scenarioYearId);
    expect(counts.financeScenarioFindMany).toBe(1);
    expect(counts.financeScenarioBaselineLineFindMany).toBe(1);
    expect(counts.financeScenarioAssumptionFindMany).toBe(1);
  });

  it("enforces tenant and finance year isolation", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Tenant A",
      expectedCurrentForecastVersionId: "fv-v1",
    });
    await expect(
      loadFinanceScenarioDetail(db, scenarioCtx({ tenantId: scenarioTenantB }), {
        financeYearId: scenarioYearId,
        scenarioId: created.scenarioId,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });
});

describe("FIN-04D-04 scenario detail & comparisons", () => {
  let store: ScenarioStore;

  beforeEach(() => {
    store = createEmptyScenarioStore();
    seedCurrentForecast(
      store,
      [
        { financialAccountId: "acc-income", amountMinor: 1_000_000 },
        { financialAccountId: "acc-expense", amountMinor: 400_000 },
      ],
      "fv-v3",
      { versionNumber: 3, revisionLabel: "Q3 Review" },
    );
  });

  it("composes frozen baseline primary comparison and exposes updatedAt", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Detail",
      expectedCurrentForecastVersionId: "fv-v3",
    });
    const detail = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: created.scenarioId,
    });
    expect(detail.updatedAt).toBeTruthy();
    expect(detail.comparison.primary.baselineResultMinor).toBe(600_000);
    expect(detail.comparison.primary.scenarioResultMinor).toBe(600_000);
    expect(detail.comparison.sourceForecast.forecastVersionId).toBe("fv-v3");
    expect(detail.comparison.baselineFreshness.status).toBe("CURRENT");
    expect(detail.calculation.engineVersion).toBe("sce-scenario-v1");
  });

  it("marks baseline outdated when current forecast pointer moved to v4", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Frozen on v3",
      expectedCurrentForecastVersionId: "fv-v3",
    });
    await upsertFinanceScenarioAssumption(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: created.updatedAt,
      financialAccountId: "acc-income",
      assumption: { kind: "DELTA_AMOUNT", amountMinorDelta: 50_000 },
    });

    store.financeForecast[0]!.currentVersionId = "fv-v4";
    store.financeForecastVersion.push({
      id: "fv-v4",
      forecastId: "ff-1",
      status: "CURRENT",
      versionNumber: 4,
      revisionLabel: "Q4 Review",
      revisionSource: "MANUAL_REFORECAST",
    });
    store.financeForecastLine.push(
      {
        id: "fl-v4-income",
        forecastVersionId: "fv-v4",
        financialAccountId: "acc-income",
        amountMinor: 1_100_000,
      },
      {
        id: "fl-v4-expense",
        forecastVersionId: "fv-v4",
        financialAccountId: "acc-expense",
        amountMinor: 400_000,
      },
    );
    store.financeForecastVersion[0]!.status = "SUPERSEDED";

    const detail = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: created.scenarioId,
    });

    expect(detail.comparison.baselineFreshness.status).toBe("OUTDATED");
    expect(detail.comparison.primary.baselineResultMinor).toBe(600_000);
    expect(detail.comparison.primary.scenarioResultMinor).toBe(650_000);
    expect(detail.comparison.liveCurrentForecast.kind).toBe("AVAILABLE");
    if (detail.comparison.liveCurrentForecast.kind === "AVAILABLE") {
      expect(detail.comparison.liveCurrentForecast.currentForecastResultMinor).toBe(700_000);
      expect(detail.comparison.liveCurrentForecast.scenarioVsCurrentResultDeltaMinor).toBe(-50_000);
    }
  });

  it("returns NO_APPROVED_BUDGET without fabricating zero and uses approved baseline when present", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Budget compare",
      expectedCurrentForecastVersionId: "fv-v3",
    });
    const withoutBudget = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: created.scenarioId,
    });
    expect(withoutBudget.comparison.approvedBudget).toEqual({ kind: "NO_APPROVED_BUDGET" });

    seedApprovedBudget(store, [
      { financialAccountId: "acc-income", amountMinor: 900_000 },
      { financialAccountId: "acc-expense", amountMinor: 350_000 },
    ]);
    const withBudget = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: created.scenarioId,
    });
    if (withBudget.comparison.approvedBudget.kind === "AVAILABLE") {
      expect(withBudget.comparison.approvedBudget.approvedBudgetResultMinor).toBe(550_000);
      expect(withBudget.comparison.approvedBudget.scenarioVsApprovedBudgetResultDeltaMinor).toBe(
        50_000,
      );
    } else {
      throw new Error("expected approved budget");
    }

    seedApprovedBudget(
      store,
      [{ financialAccountId: "acc-income", amountMinor: 100 }],
      { approved: false, versionId: "bv-draft" },
    );
    store.financeBudget[0]!.currentBaselineVersionId = "bv-draft";
    const draftOnly = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: created.scenarioId,
    });
    expect(draftOnly.comparison.approvedBudget).toEqual({ kind: "NO_APPROVED_BUDGET" });
  });

  it("ranks drivers by absolute result contribution with top bounding and offsetting zero net", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Drivers",
      expectedCurrentForecastVersionId: "fv-v3",
    });
    let updatedAt = created.updatedAt;
    await upsertFinanceScenarioAssumption(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: updatedAt,
      financialAccountId: "acc-income",
      assumption: { kind: "DELTA_AMOUNT", amountMinorDelta: 20_000 },
    });
    const afterIncome = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: created.scenarioId,
    });
    updatedAt = afterIncome.updatedAt;
    await upsertFinanceScenarioAssumption(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: updatedAt,
      financialAccountId: "acc-expense",
      assumption: { kind: "DELTA_AMOUNT", amountMinorDelta: 20_000 },
    });

    const detail = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: created.scenarioId,
    });

    expect(detail.comparison.primary.resultDeltaMinor).toBe(0);
    expect(detail.comparison.summaryState).toBe("RESULT_CHANGED");
    expect(detail.comparison.changeFlags.hasCompositionChange).toBe(true);
    expect(detail.allDrivers).toHaveLength(2);
    expect(detail.topDrivers).toHaveLength(2);
    expect(detail.topDrivers[0]!.absoluteResultContributionMinor).toBeGreaterThanOrEqual(
      detail.topDrivers[1]!.absoluteResultContributionMinor,
    );
    expect(FINANCE_SCENARIO_TOP_DRIVERS_DEFAULT_LIMIT).toBe(5);
  });

  it("distinguishes NO_ASSUMPTIONS from NO_RESULT_CHANGE", async () => {
    const db = makeScenarioDb(store);
    const empty = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Empty",
      expectedCurrentForecastVersionId: "fv-v3",
    });
    const emptyDetail = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: empty.scenarioId,
    });
    expect(emptyDetail.comparison.summaryState).toBe("NO_ASSUMPTIONS");

    const zeroEffect = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Zero effect",
      expectedCurrentForecastVersionId: "fv-v3",
    });
    await upsertFinanceScenarioAssumption(db, scenarioCtx(), {
      scenarioId: zeroEffect.scenarioId,
      expectedUpdatedAt: zeroEffect.updatedAt,
      financialAccountId: "acc-income",
      assumption: { kind: "PERCENT_CHANGE", percentBasisPoints: 0 },
    });
    const zeroDetail = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: zeroEffect.scenarioId,
    });
    expect(zeroDetail.comparison.summaryState).toBe("NO_RESULT_CHANGE");
  });

  it("requires finance.forecast.view", async () => {
    const db = makeScenarioDb(store);
    await expect(
      loadFinanceScenarioList(db, scenarioCtx({ permissionKeys: new Set() }), scenarioYearId),
    ).rejects.toBeInstanceOf(FinanceDomainError);
  });

  it("keeps archived scenarios readable in detail", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Archived readable",
      expectedCurrentForecastVersionId: "fv-v3",
    });
    await archiveFinanceScenario(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: created.updatedAt,
    });
    const detail = await loadFinanceScenarioDetail(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      scenarioId: created.scenarioId,
    });
    expect(detail.isArchived).toBe(true);
    expect(detail.comparison.primary.scenarioResultMinor).toBe(600_000);
  });
});

describe("FIN-04D-04 source boundaries", () => {
  it("does not depend on automatic forecast in query service", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/finance/services/finance-scenario-query-service.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/automaticForecast|FinanceProjection|AutomaticForecast/i);
    expect(source).toContain("loadFinanceScenarioList");
    expect(source).toContain("loadFinanceScenarioDetail");
  });
});
