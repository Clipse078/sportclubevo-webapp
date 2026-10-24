import { describe, expect, it } from "vitest";
import {
  createEmptyScenarioStore,
  makeScenarioDb,
  scenarioCtx,
  scenarioYearId,
  seedCurrentForecast,
} from "@/lib/finance/__tests__/finance-04d-02-scenario-mock-db";
import {
  createFinanceScenario,
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
import { loadFinanceScenarioDetail } from "@/lib/finance/services/finance-scenario-query-service";

const V3_ID = "fv-v3";
const INCOME_MINOR = 200_000_00;
const EXPENSE_MINOR = 50_000_00;
const PERCENT_BPS = -1000;

describe("FIN-04D-07 adoption → outdated → rebase lifecycle", () => {
  it("models Product Owner UAT governance sequence end-to-end", async () => {
    const store = createEmptyScenarioStore();
    seedCurrentForecast(
      store,
      [
        { financialAccountId: "acc-income", amountMinor: INCOME_MINOR },
        { financialAccountId: "acc-expense", amountMinor: EXPENSE_MINOR },
      ],
      V3_ID,
      { versionNumber: 3, revisionLabel: "V3" },
    );
    const db = makeScenarioDb(store);
    const ctx = scenarioCtx();

    const created = await createFinanceScenario(db, ctx, {
      financeYearId: scenarioYearId,
      name: "Lifecycle variant",
      expectedCurrentForecastVersionId: V3_ID,
    });
    await upsertFinanceScenarioAssumption(db, ctx, {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: created.updatedAt,
      financialAccountId: "acc-income",
      assumption: { kind: "PERCENT_CHANGE", percentBasisPoints: PERCENT_BPS },
    });

    const detailInput = { financeYearId: scenarioYearId, scenarioId: created.scenarioId };
    const beforeAdopt = await loadFinanceScenarioDetail(db, ctx, detailInput);
    const scenarioResultBeforeAdopt = beforeAdopt.comparison.primary.scenarioResultMinor;
    expect(beforeAdopt.comparison.baselineFreshness.status).toBe("CURRENT");
    expect(scenarioResultBeforeAdopt).toBe(130_000_00);

    const adoptionPreview = await previewFinanceScenarioAdoption(db, ctx, {
      scenarioId: created.scenarioId,
    });
    expect(adoptionPreview.canAdopt).toBe(true);

    let scenario = await db.financeScenario.findUnique({ where: { id: created.scenarioId } });
    const adoption = await adoptFinanceScenarioToCurrentForecast(db, ctx, {
      scenarioId: created.scenarioId,
      expectedScenarioUpdatedAt: scenario!.updatedAt,
      expectedCurrentForecastVersionId: V3_ID,
    });

    const v3 = store.financeForecastVersion.find((v) => v.id === V3_ID);
    const v4 = store.financeForecastVersion.find((v) => v.id === adoption.targetForecastVersionId);
    expect(v3?.status).toBe("SUPERSEDED");
    expect(v4?.status).toBe("CURRENT");
    expect(v4?.versionNumber).toBe(4);
    expect(store.financeForecast[0]?.currentVersionId).toBe(adoption.targetForecastVersionId);

    const adoptedIncome = store.financeForecastLine.find(
      (l) =>
        l.forecastVersionId === adoption.targetForecastVersionId &&
        l.financialAccountId === "acc-income",
    );
    expect(adoptedIncome?.amountMinor).toBe(180_000_00);

    scenario = await db.financeScenario.findUnique({ where: { id: created.scenarioId } });
    expect(scenario!.sourceForecastVersionId).toBe(V3_ID);
    expect(store.financeScenarioAdoption).toHaveLength(1);
    expect(store.financeScenarioAdoption[0]).toMatchObject({
      scenarioId: created.scenarioId,
      sourceForecastVersionId: V3_ID,
      resultingForecastVersionId: adoption.targetForecastVersionId,
    });

    const assumption = store.financeScenarioAssumption.find((a) => a.scenarioId === created.scenarioId);
    expect(assumption?.percentBasisPoints).toBe(PERCENT_BPS);

    const afterAdopt = await loadFinanceScenarioDetail(db, ctx, detailInput);
    expect(afterAdopt.comparison.baselineFreshness.status).toBe("OUTDATED");
    expect(afterAdopt.comparison.primary.scenarioResultMinor).toBe(scenarioResultBeforeAdopt);
    expect(afterAdopt.comparison.liveCurrentForecast.kind).toBe("AVAILABLE");
    if (afterAdopt.comparison.liveCurrentForecast.kind === "AVAILABLE") {
      expect(afterAdopt.comparison.liveCurrentForecast.scenarioVsCurrentResultDeltaMinor).toBe(0);
    }

    const rebasePreview = await previewFinanceScenarioRebase(db, ctx, {
      scenarioId: created.scenarioId,
    });
    expect(rebasePreview.baselineOutdated).toBe(true);
    expect(rebasePreview.canRebase).toBe(true);
    expect(rebasePreview.prospectiveScenarioResultMinor).not.toBe(scenarioResultBeforeAdopt);
    expect(rebasePreview.prospectiveScenarioResultMinor).toBe(112_000_00);

    const forecastVersionCountBeforeRebase = store.financeForecastVersion.length;
    scenario = await db.financeScenario.findUnique({ where: { id: created.scenarioId } });
    const rebase = await rebaseFinanceScenario(db, ctx, {
      scenarioId: created.scenarioId,
      expectedScenarioUpdatedAt: scenario!.updatedAt,
      expectedCurrentForecastVersionId: adoption.targetForecastVersionId,
    });

    expect(rebase.sourceForecastVersionId).toBe(adoption.targetForecastVersionId);
    expect(store.financeForecastVersion.length).toBe(forecastVersionCountBeforeRebase);
    expect(store.financeForecast[0]?.currentVersionId).toBe(adoption.targetForecastVersionId);
    expect(store.financeScenarioRebase).toHaveLength(1);

    const afterRebase = await loadFinanceScenarioDetail(db, ctx, detailInput);
    expect(afterRebase.comparison.baselineFreshness.status).toBe("CURRENT");
    expect(afterRebase.comparison.primary.scenarioResultMinor).toBe(
      rebasePreview.prospectiveScenarioResultMinor,
    );
    expect(store.financeScenarioAssumption[0]?.percentBasisPoints).toBe(PERCENT_BPS);
  });
});
