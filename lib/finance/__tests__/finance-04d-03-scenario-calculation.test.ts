import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  assertFinanceScenarioCalculationIntegrity,
  calculateFinanceScenario,
} from "@/lib/finance/forecast/calculate-finance-scenario";
import { FinanceScenarioCalculationError } from "@/lib/finance/forecast/finance-scenario-calculation-errors";
import {
  FINANCE_SCENARIO_CALCULATION_ENGINE_VERSION,
  type FinanceScenarioCalculationInput,
} from "@/lib/finance/forecast/finance-scenario-calculation-types";
import {
  archiveFinanceScenario,
  calculatePersistedFinanceScenario,
  createFinanceScenario,
  getFinanceScenarioById,
  upsertFinanceScenarioAssumption,
} from "@/lib/finance/services/finance-scenario-service";
import {
  createEmptyScenarioStore,
  makeScenarioDb,
  scenarioCtx,
  scenarioTenantB,
  scenarioYearId,
  seedCurrentForecast,
} from "@/lib/finance/__tests__/finance-04d-02-scenario-mock-db";

function baseCalcInput(
  overrides?: Partial<FinanceScenarioCalculationInput>,
): FinanceScenarioCalculationInput {
  return {
    scenarioId: "sc-calc",
    tenantId: "tenant-a",
    financeYearId: scenarioYearId,
    baselineLines: [
      { financialAccountId: "acc-income", amountMinor: 1_000_000 },
      { financialAccountId: "acc-expense", amountMinor: 400_000 },
    ],
    assumptions: [],
    accountSemantics: [
      { financialAccountId: "acc-income", canonicalSemantic: "INCOME" },
      { financialAccountId: "acc-expense", canonicalSemantic: "EXPENSE" },
    ],
    ...overrides,
  };
}

describe("FIN-04D-03 pure scenario calculation engine", () => {
  it("returns baseline unchanged when there are no assumptions", () => {
    const result = calculateFinanceScenario(baseCalcInput());
    expect(result.engineVersion).toBe(FINANCE_SCENARIO_CALCULATION_ENGINE_VERSION);
    expect(result.assumptionEffects).toEqual([]);
    expect(result.totals.incomeDeltaMinor).toBe(0);
    expect(result.totals.expenseDeltaMinor).toBe(0);
    expect(result.totals.resultDeltaMinor).toBe(0);
    expect(result.totals.baselineIncomeMinor).toBe(1_000_000);
    expect(result.totals.baselineExpenseMinor).toBe(400_000);
    expect(result.totals.baselineResultMinor).toBe(600_000);
    expect(result.totals.incomeMinor).toBe(1_000_000);
    expect(result.totals.expenseMinor).toBe(400_000);
    expect(result.totals.resultMinor).toBe(600_000);
    for (const row of result.accountResults) {
      expect(row.deltaMinor).toBe(0);
      expect(row.assumptionApplied).toBe(false);
    }
  });

  it("applies PERCENT_CHANGE with integer rational rounding", () => {
    const result = calculateFinanceScenario(
      baseCalcInput({
        assumptions: [
          {
            financialAccountId: "acc-income",
            kind: "PERCENT_CHANGE",
            percentBasisPoints: -1000,
          },
        ],
      }),
    );
    const income = result.accountResults.find((r) => r.financialAccountId === "acc-income")!;
    expect(income.scenarioAmountMinor).toBe(900_000);
    expect(income.deltaMinor).toBe(-100_000);
    expect(income.resultContributionMinor).toBe(-100_000);
    expect(result.totals.resultDeltaMinor).toBe(-100_000);
  });

  it("applies fractional percent via basis points with half-away-from-zero rounding", () => {
    const result = calculateFinanceScenario(
      baseCalcInput({
        baselineLines: [{ financialAccountId: "acc-income", amountMinor: 9999 }],
        accountSemantics: [{ financialAccountId: "acc-income", canonicalSemantic: "INCOME" }],
        assumptions: [
          {
            financialAccountId: "acc-income",
            kind: "PERCENT_CHANGE",
            percentBasisPoints: 250,
          },
        ],
      }),
    );
    expect(result.accountResults[0]!.scenarioAmountMinor).toBe(10249);
  });

  it("applies DELTA_AMOUNT and ABSOLUTE_AMOUNT including zero absolute", () => {
    const deltaResult = calculateFinanceScenario(
      baseCalcInput({
        assumptions: [
          { financialAccountId: "acc-income", kind: "DELTA_AMOUNT", amountMinorDelta: 20_000 },
        ],
      }),
    );
    expect(deltaResult.accountResults.find((r) => r.financialAccountId === "acc-income")!.scenarioAmountMinor).toBe(
      1_020_000,
    );

    const absoluteZero = calculateFinanceScenario(
      baseCalcInput({
        assumptions: [
          { financialAccountId: "acc-expense", kind: "ABSOLUTE_AMOUNT", absoluteAmountMinor: 0 },
        ],
      }),
    );
    expect(
      absoluteZero.accountResults.find((r) => r.financialAccountId === "acc-expense")!.scenarioAmountMinor,
    ).toBe(0);
  });

  it("applies EXCLUDE_ACCOUNT including zero baseline", () => {
    const exclude = calculateFinanceScenario(
      baseCalcInput({
        assumptions: [{ financialAccountId: "acc-income", kind: "EXCLUDE_ACCOUNT" }],
      }),
    );
    const income = exclude.accountResults.find((r) => r.financialAccountId === "acc-income")!;
    expect(income.scenarioAmountMinor).toBe(0);
    expect(income.deltaMinor).toBe(-1_000_000);
    expect(income.assumptionApplied).toBe(true);

    const excludeZero = calculateFinanceScenario(
      baseCalcInput({
        baselineLines: [
          { financialAccountId: "acc-income", amountMinor: 0 },
          { financialAccountId: "acc-expense", amountMinor: 100 },
        ],
        assumptions: [{ financialAccountId: "acc-income", kind: "EXCLUDE_ACCOUNT" }],
      }),
    );
    expect(excludeZero.accountResults.find((r) => r.financialAccountId === "acc-income")!.deltaMinor).toBe(0);
  });

  it("derives expense result contribution with inverted sign", () => {
    const result = calculateFinanceScenario(
      baseCalcInput({
        assumptions: [
          { financialAccountId: "acc-expense", kind: "DELTA_AMOUNT", amountMinorDelta: 10_000 },
        ],
      }),
    );
    const expense = result.accountResults.find((r) => r.financialAccountId === "acc-expense")!;
    expect(expense.resultContributionMinor).toBe(-10_000);
    const contributionSum = result.assumptionEffects.reduce(
      (sum, row) => sum + row.resultContributionMinor,
      0,
    );
    expect(contributionSum).toBe(result.totals.resultDeltaMinor);
  });

  it("preserves unchanged accounts and lists all baseline accounts exactly once", () => {
    const result = calculateFinanceScenario(
      baseCalcInput({
        assumptions: [
          { financialAccountId: "acc-income", kind: "PERCENT_CHANGE", percentBasisPoints: 500 },
        ],
      }),
    );
    expect(result.accountResults).toHaveLength(2);
    const expense = result.accountResults.find((r) => r.financialAccountId === "acc-expense")!;
    expect(expense.assumptionApplied).toBe(false);
    expect(expense.scenarioAmountMinor).toBe(expense.baselineAmountMinor);
    expect(result.assumptionEffects).toHaveLength(1);
  });

  it("rejects duplicate baseline, duplicate assumptions, and missing baseline account", () => {
    expect(() =>
      calculateFinanceScenario(
        baseCalcInput({
          baselineLines: [
            { financialAccountId: "acc-income", amountMinor: 1 },
            { financialAccountId: "acc-income", amountMinor: 2 },
          ],
        }),
      ),
    ).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_BASELINE_ACCOUNT" } satisfies Partial<FinanceScenarioCalculationError>),
    );

    expect(() =>
      calculateFinanceScenario(
        baseCalcInput({
          assumptions: [
            { financialAccountId: "acc-income", kind: "PERCENT_CHANGE", percentBasisPoints: 100 },
            { financialAccountId: "acc-income", kind: "DELTA_AMOUNT", amountMinorDelta: 1 },
          ],
        }),
      ),
    ).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_ASSUMPTION_ACCOUNT" }),
    );

    expect(() =>
      calculateFinanceScenario(
        baseCalcInput({
          assumptions: [{ financialAccountId: "acc-missing", kind: "EXCLUDE_ACCOUNT" }],
        }),
      ),
    ).toThrowError(
      expect.objectContaining({ code: "ASSUMPTION_ACCOUNT_NOT_IN_BASELINE" }),
    );
  });

  it("rejects unsupported account semantics and unsafe overflow on delta", () => {
    expect(() =>
      calculateFinanceScenario(
        baseCalcInput({
          baselineLines: [{ financialAccountId: "acc-weird", amountMinor: 2 }],
          accountSemantics: [
            {
              financialAccountId: "acc-weird",
              canonicalSemantic: "ASSET" as unknown as "INCOME",
            },
          ],
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "UNSUPPORTED_ACCOUNT_TYPE" }));

    const max = Number.MAX_SAFE_INTEGER;
    expect(() =>
      calculateFinanceScenario(
        baseCalcInput({
          baselineLines: [{ financialAccountId: "acc-income", amountMinor: max }],
          accountSemantics: [{ financialAccountId: "acc-income", canonicalSemantic: "INCOME" }],
          assumptions: [
            { financialAccountId: "acc-income", kind: "DELTA_AMOUNT", amountMinorDelta: 1 },
          ],
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "UNSAFE_INTEGER_RESULT" }));
  });

  it("is deterministic, order-independent, and does not mutate input", () => {
    const input = baseCalcInput({
      assumptions: [
        { financialAccountId: "acc-expense", kind: "DELTA_AMOUNT", amountMinorDelta: -5_000 },
        { financialAccountId: "acc-income", kind: "PERCENT_CHANGE", percentBasisPoints: 1000 },
      ],
    });
    const frozen = structuredClone(input);
    const first = calculateFinanceScenario(input);
    const second = calculateFinanceScenario(input);
    expect(first).toEqual(second);
    expect(input).toEqual(frozen);

    const reversed = calculateFinanceScenario({
      ...input,
      assumptions: [...input.assumptions].reverse(),
    });
    expect(reversed.totals).toEqual(first.totals);
    expect(reversed.accountResults).toEqual(first.accountResults);
  });

  it("sorts account results and effects by financialAccountId", () => {
    const result = calculateFinanceScenario(baseCalcInput());
    const ids = result.accountResults.map((r) => r.financialAccountId);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("FIN-04D-03 persisted scenario calculation service", () => {
  let store = createEmptyScenarioStore();

  beforeEach(() => {
    store = createEmptyScenarioStore();
    seedCurrentForecast(store, [
      { financialAccountId: "acc-income", amountMinor: 200_000 },
      { financialAccountId: "acc-expense", amountMinor: 80_000 },
    ]);
  });

  it("calculates a persisted scenario with finance.forecast.view", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Calc test",
    });
    await upsertFinanceScenarioAssumption(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
      financialAccountId: "acc-income",
      expectedUpdatedAt: created.updatedAt,
      assumption: { kind: "PERCENT_CHANGE", percentBasisPoints: -500 },
    });
    const scenario = store.financeScenario[0]!;
    const result = await calculatePersistedFinanceScenario(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
    });
    expect(result.totals.baselineIncomeMinor).toBe(200_000);
    expect(result.totals.incomeMinor).toBe(190_000);
    expect(result.scenarioId).toBe(created.scenarioId);
    expect(scenario.sourceForecastVersionId).toBe("fv-v1");
  });

  it("requires finance.forecast.view and enforces tenant / finance year isolation", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Iso",
    });
    await expect(
      calculatePersistedFinanceScenario(db, scenarioCtx({ permissionKeys: new Set(["finance.forecast.manage"]) }), {
        scenarioId: created.scenarioId,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });

    await expect(
      calculatePersistedFinanceScenario(db, scenarioCtx({ tenantId: scenarioTenantB }), {
        scenarioId: created.scenarioId,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });

    await expect(
      calculatePersistedFinanceScenario(db, scenarioCtx(), {
        scenarioId: created.scenarioId,
        financeYearId: "wrong-year",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_NOT_FOUND" });
  });

  it("calculates archived scenarios", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Archived calc",
    });
    const row = await getFinanceScenarioById(db, scenarioCtx(), created.scenarioId);
    const archived = await archiveFinanceScenario(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: row.updatedAt,
    });
    const result = await calculatePersistedFinanceScenario(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
    });
    expect(result.totals.resultMinor).toBe(120_000);
    expect(archived.archivedAt).not.toBeNull();
  });

  it("keeps frozen baseline when live current forecast advances to V4", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Frozen",
      initialAssumptions: [
        {
          financialAccountId: "acc-income",
          kind: "PERCENT_CHANGE",
          percentBasisPoints: -1000,
        },
      ],
    });
    const before = await calculatePersistedFinanceScenario(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
    });

    store.financeForecast[0]!.currentVersionId = "fv-v4";
    store.financeForecastVersion.push({
      id: "fv-v4",
      forecastId: "ff-1",
      status: "CURRENT",
      versionNumber: 4,
    });
    store.financeForecastLine.push(
      { id: "fl-v4-i", forecastVersionId: "fv-v4", financialAccountId: "acc-income", amountMinor: 9_999_999 },
      { id: "fl-v4-e", forecastVersionId: "fv-v4", financialAccountId: "acc-expense", amountMinor: 1 },
    );

    const after = await calculatePersistedFinanceScenario(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
    });
    expect(after).toEqual(before);
    expect(after.totals.baselineIncomeMinor).toBe(200_000);
    expect(after.totals.incomeMinor).toBe(180_000);
  });

  it("does not depend on approved budget or automatic forecast loaders", () => {
    const serviceSource = readFileSync(
      resolve(process.cwd(), "lib/finance/services/finance-scenario-service.ts"),
      "utf8",
    );
    const calcSection = serviceSource.slice(serviceSource.indexOf("calculatePersistedFinanceScenario"));
    expect(calcSection).not.toMatch(/approvedBudget|ApprovedBudget|automaticForecast|FinanceProjection/i);
    expect(calcSection).not.toContain("financeForecastLine.findMany");
  });
});

describe("FIN-04D-03 documentation and migration boundary", () => {
  it("documents the calculation engine package", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "docs/finance/SCE-FINANCE-04D-03-SCENARIO-CALCULATION-ENGINE.md"),
      "utf8",
    );
    expect(doc).toContain("sce-scenario-v1");
    expect(doc).toContain("frozen baseline");
    expect(doc).toMatch(/derived and not persisted/i);
    expect(doc).toMatch(/No new migration/i);
  });

  it("requires no new migration beyond 04D-02", () => {
    const migrations = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(migrations).not.toContain("model FinanceScenarioResultLine");
  });
});

describe("FIN-04D-03 integrity helper", () => {
  it("throws when contribution sum diverges from result delta", () => {
    const result = calculateFinanceScenario(baseCalcInput());
    expect(() =>
      assertFinanceScenarioCalculationIntegrity({
        ...result,
        assumptionEffects: [
          {
            financialAccountId: "acc-income",
            kind: "PERCENT_CHANGE",
            baselineAmountMinor: 1,
            resultAmountMinor: 2,
            deltaMinor: 1,
            resultContributionMinor: 999,
            percentBasisPoints: 100,
            amountMinorDelta: null,
            absoluteAmountMinor: null,
          },
        ],
      }),
    ).toThrow(FinanceScenarioCalculationError);
  });
});
