import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildScenarioAdoptionPreview } from "@/lib/finance/forecast/scenario-adoption-policy";
import { FIN_04D_SCENARIO_ADOPTION_REVISION_SOURCE } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";
import {
  createEmptyScenarioStore,
  makeScenarioDb,
  scenarioCtx,
  scenarioYearId,
  seedCurrentForecast,
} from "@/lib/finance/__tests__/finance-04d-02-scenario-mock-db";
import {
  createFinanceScenario,
  deleteFinanceScenario,
  upsertFinanceScenarioAssumption,
} from "@/lib/finance/services/finance-scenario-service";
import {
  adoptFinanceScenarioToCurrentForecast,
  previewFinanceScenarioAdoption,
} from "@/lib/finance/services/finance-scenario-adoption-service";
import {
  previewFinanceScenarioRebase,
  rebaseFinanceScenario,
} from "@/lib/finance/services/finance-scenario-rebase-service";

const detailPanel = readFileSync(
  join(process.cwd(), "components/admin/finance/scenario/FinanceScenarioDetailPanel.tsx"),
  "utf8",
);
const governanceDialogs = readFileSync(
  join(process.cwd(), "components/admin/finance/scenario/FinanceScenarioGovernanceDialogs.tsx"),
  "utf8",
);
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

function advanceForecastToV2(store: ReturnType<typeof createEmptyScenarioStore>) {
  store.financeForecastVersion.push({
    id: "fv-v2",
    forecastId: "ff-1",
    status: "CURRENT",
    versionNumber: 2,
    revisionLabel: "V2",
    revisionSource: "MANUAL_REFORECAST",
    asOfDate: new Date("2026-07-01"),
    actualsThroughDate: new Date("2026-06-30"),
    scenarioKey: null,
  });
  store.financeForecast[0]!.currentVersionId = "fv-v2";
  store.financeForecastVersion.find((v) => v.id === "fv-v1")!.status = "SUPERSEDED";
  store.financeForecastLine.push(
    {
      id: "fl-v2-income",
      forecastVersionId: "fv-v2",
      financialAccountId: "acc-income",
      amountMinor: 220_000_00,
    },
    {
      id: "fl-v2-expense",
      forecastVersionId: "fv-v2",
      financialAccountId: "acc-expense",
      amountMinor: 50_000_00,
    },
  );
}

describe("FIN-04D-06 scenario adoption policy", () => {
  it("preserves current-only accounts and adopts scenario baseline amounts", () => {
    const preview = buildScenarioAdoptionPreview({
      sourceForecastVersionId: "fv-2",
      scenarioBaselineAccountIds: new Set(["acc-income"]),
      scenarioAmountByAccountId: new Map([["acc-income", 180_000_00]]),
      currentForecastAmountByAccountId: new Map([
        ["acc-income", 220_000_00],
        ["acc-expense", 50_000_00],
      ]),
      accounts: [
        { accountId: "acc-income", semantic: "INCOME", lifecycle: "ACTIVE" },
        { accountId: "acc-expense", semantic: "EXPENSE", lifecycle: "ACTIVE" },
      ],
    });
    expect(preview.persistableLines).toEqual([
      { financialAccountId: "acc-expense", amountMinor: 50_000_00 },
      { financialAccountId: "acc-income", amountMinor: 180_000_00 },
    ]);
  });
});

describe("FIN-04D-06 scenario adoption domain", () => {
  it("creates formal revision with SCENARIO_ADOPTION provenance", async () => {
    const store = createEmptyScenarioStore();
    seedCurrentForecast(store, [
      { financialAccountId: "acc-income", amountMinor: 100_000_00 },
      { financialAccountId: "acc-expense", amountMinor: 40_000_00 },
    ]);
    const db = makeScenarioDb(store);
    const ctx = scenarioCtx();

    const created = await createFinanceScenario(db, ctx, {
      financeYearId: scenarioYearId,
      name: "Test variant",
      expectedCurrentForecastVersionId: "fv-v1",
    });
    await upsertFinanceScenarioAssumption(db, ctx, {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: created.updatedAt,
      financialAccountId: "acc-income",
      assumption: { kind: "PERCENT_CHANGE", percentBasisPoints: -1000 },
    });
    const scenario = await db.financeScenario.findUnique({
      where: { id: created.scenarioId },
    });

    const result = await adoptFinanceScenarioToCurrentForecast(db, ctx, {
      scenarioId: created.scenarioId,
      expectedScenarioUpdatedAt: scenario!.updatedAt,
      expectedCurrentForecastVersionId: "fv-v1",
    });

    expect(result.targetVersionNumber).toBe(2);
    const superseded = store.financeForecastVersion.find((v) => v.id === "fv-v1");
    const current = store.financeForecastVersion.find((v) => v.id === result.targetForecastVersionId);
    expect(superseded?.status).toBe("SUPERSEDED");
    expect(current?.status).toBe("CURRENT");
    expect(current?.revisionSource).toBe(FIN_04D_SCENARIO_ADOPTION_REVISION_SOURCE);
    expect(store.financeForecast[0]?.currentVersionId).toBe(result.targetForecastVersionId);
    expect(store.financeScenarioAdoption).toHaveLength(1);
    const incomeLine = store.financeForecastLine.find(
      (l) => l.forecastVersionId === result.targetForecastVersionId && l.financialAccountId === "acc-income",
    );
    expect(incomeLine?.amountMinor).toBe(90_000_00);
  });

  it("rejects stale scenario and stale current forecast tokens", async () => {
    const store = createEmptyScenarioStore();
    seedCurrentForecast(store, [{ financialAccountId: "acc-income", amountMinor: 100_000_00 }]);
    const db = makeScenarioDb(store);
    const ctx = scenarioCtx();
    const created = await createFinanceScenario(db, ctx, {
      financeYearId: scenarioYearId,
      name: "Stale test",
    });

    await expect(
      adoptFinanceScenarioToCurrentForecast(db, ctx, {
        scenarioId: created.scenarioId,
        expectedScenarioUpdatedAt: new Date("2020-01-01"),
        expectedCurrentForecastVersionId: "fv-v1",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_STALE" });

    await expect(
      adoptFinanceScenarioToCurrentForecast(db, ctx, {
        scenarioId: created.scenarioId,
        expectedScenarioUpdatedAt: created.updatedAt,
        expectedCurrentForecastVersionId: "fv-wrong",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_STALE_CURRENT_FORECAST" });
  });

  it("blocks delete after adoption", async () => {
    const store = createEmptyScenarioStore();
    seedCurrentForecast(store, [{ financialAccountId: "acc-income", amountMinor: 100_000_00 }]);
    const db = makeScenarioDb(store);
    const ctx = scenarioCtx();
    const created = await createFinanceScenario(db, ctx, {
      financeYearId: scenarioYearId,
      name: "Adopted",
    });
    const scenario = await db.financeScenario.findUnique({ where: { id: created.scenarioId } });
    await adoptFinanceScenarioToCurrentForecast(db, ctx, {
      scenarioId: created.scenarioId,
      expectedScenarioUpdatedAt: scenario!.updatedAt,
      expectedCurrentForecastVersionId: "fv-v1",
    });
    const fresh = await db.financeScenario.findUnique({ where: { id: created.scenarioId } });
    await expect(
      deleteFinanceScenario(db, ctx, {
        scenarioId: created.scenarioId,
        expectedUpdatedAt: fresh!.updatedAt,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_DELETE_BLOCKED_ADOPTION" });
  });
});

describe("FIN-04D-06 scenario rebase domain", () => {
  it("preserves percent assumption against new baseline", async () => {
    const store = createEmptyScenarioStore();
    seedCurrentForecast(
      store,
      [
        { financialAccountId: "acc-income", amountMinor: 200_000_00 },
        { financialAccountId: "acc-expense", amountMinor: 50_000_00 },
      ],
      "fv-v1",
    );
    const db = makeScenarioDb(store);
    const ctx = scenarioCtx();

    const created = await createFinanceScenario(db, ctx, {
      financeYearId: scenarioYearId,
      name: "Rebase me",
      expectedCurrentForecastVersionId: "fv-v1",
    });
    advanceForecastToV2(store);
    await upsertFinanceScenarioAssumption(db, ctx, {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: created.updatedAt,
      financialAccountId: "acc-income",
      assumption: { kind: "PERCENT_CHANGE", percentBasisPoints: -1000 },
    });

    const preview = await previewFinanceScenarioRebase(db, ctx, { scenarioId: created.scenarioId });
    expect(preview.baselineOutdated).toBe(true);
    expect(preview.canRebase).toBe(true);
    expect(preview.prospectiveScenarioResultMinor).toBe(148_000_00);

    const scenario = await db.financeScenario.findUnique({ where: { id: created.scenarioId } });
    const result = await rebaseFinanceScenario(db, ctx, {
      scenarioId: created.scenarioId,
      expectedScenarioUpdatedAt: scenario!.updatedAt,
      expectedCurrentForecastVersionId: "fv-v2",
    });
    expect(result.sourceForecastVersionId).toBe("fv-v2");
    expect(store.financeScenarioRebase).toHaveLength(1);
    const baselineIncome = store.financeScenarioBaselineLine.find(
      (l) => l.scenarioId === created.scenarioId && l.financialAccountId === "acc-income",
    );
    expect(baselineIncome?.amountMinor).toBe(220_000_00);
  });

  it("blocks rebase when assumption account missing from new baseline", async () => {
    const store = createEmptyScenarioStore();
    store.financialAccount.push({
      id: "acc-extra",
      tenantId: store.financialAccount[0]!.tenantId,
      name: "Extra",
      code: "4100",
      sortOrder: 4,
      canonicalSemantic: "INCOME",
      lifecycle: "ACTIVE",
    });
    seedCurrentForecast(
      store,
      [
        { financialAccountId: "acc-income", amountMinor: 200_000_00 },
        { financialAccountId: "acc-extra", amountMinor: 10_000_00 },
      ],
      "fv-v1",
    );
    const db = makeScenarioDb(store);
    const ctx = scenarioCtx();
    const created = await createFinanceScenario(db, ctx, {
      financeYearId: scenarioYearId,
      name: "Unmapped",
      expectedCurrentForecastVersionId: "fv-v1",
    });
    let scenario = await db.financeScenario.findUnique({ where: { id: created.scenarioId } });
    await upsertFinanceScenarioAssumption(db, ctx, {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: scenario!.updatedAt,
      financialAccountId: "acc-extra",
      assumption: { kind: "DELTA_AMOUNT", amountMinorDelta: -1000 },
    });
    advanceForecastToV2(store);
    const preview = await previewFinanceScenarioRebase(db, ctx, { scenarioId: created.scenarioId });
    expect(preview.unmappedAssumptions).toHaveLength(1);
    expect(preview.canRebase).toBe(false);
    const scenarioAfterAssumption = await db.financeScenario.findUnique({
      where: { id: created.scenarioId },
    });
    await expect(
      rebaseFinanceScenario(db, ctx, {
        scenarioId: created.scenarioId,
        expectedScenarioUpdatedAt: scenarioAfterAssumption!.updatedAt,
        expectedCurrentForecastVersionId: "fv-v2",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_REBASE_UNMAPPED_ASSUMPTIONS" });
  });
});

describe("FIN-04D-06 scenario governance UX", () => {
  it("uses explicit German labels and no checkbox confirmation", () => {
    expect(de).toContain("Als aktuelle Prognose übernehmen");
    expect(de).toContain("Ausgangsprognose aktualisieren");
    expect(detailPanel).toContain("governance.adoptAction");
    expect(detailPanel).toContain("data-finance-scenario-decision-summary");
    expect(governanceDialogs).not.toMatch(/type="checkbox"/);
    expect(detailPanel).not.toContain("calculateFinanceScenario");
  });

  it("preview adoption exposes comparison fields", async () => {
    const store = createEmptyScenarioStore();
    seedCurrentForecast(store, [{ financialAccountId: "acc-income", amountMinor: 100_000_00 }]);
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Preview",
    });
    const preview = await previewFinanceScenarioAdoption(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
    });
    expect(preview.scenarioName).toBe("Preview");
    expect(preview.expectedCurrentForecastVersionId).toBe("fv-v1");
  });
});

describe("FIN-04D-06 migration guard", () => {
  it("adds adoption and rebase tables without data rewrite", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "prisma/migrations/20261024180000_sce_finance_04d_06_scenario_adoption_rebase/migration.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("SCENARIO_ADOPTION");
    expect(sql).toContain("FinanceScenarioAdoption");
    expect(sql).toContain("FinanceScenarioRebase");
    expect(sql).not.toMatch(/UPDATE\s+"FinanceScenario"/i);
  });
});
