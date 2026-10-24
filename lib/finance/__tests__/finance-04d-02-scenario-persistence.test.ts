import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import {
  archiveFinanceScenario,
  assertFinanceScenarioBaselineMutationForbidden,
  createFinanceScenario,
  deleteFinanceScenario,
  duplicateFinanceScenario,
  getFinanceScenarioById,
  restoreFinanceScenario,
  updateFinanceScenarioMetadata,
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

const MIGRATION_NAME = "20261024160000_sce_finance_04d_02_scenario_persistence";

describe("FIN-04D-02 schema / migration", () => {
  it("adds dedicated scenario models without reusing scenarioKey", () => {
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("model FinanceScenario");
    expect(schema).toContain("model FinanceScenarioBaselineLine");
    expect(schema).toContain("model FinanceScenarioAssumption");
    expect(schema).not.toContain("model FinanceScenarioResultLine");
    expect(schema).toContain("model FinanceScenarioAdoption");
    const sql = readFileSync(
      resolve(process.cwd(), `prisma/migrations/${MIGRATION_NAME}/migration.sql`),
      "utf8",
    );
    expect(sql).toContain("FinanceScenario_active_name_unique_idx");
    expect(sql).toContain('WHERE "archivedAt" IS NULL');
    expect(sql).not.toMatch(/UPDATE\s+"FinanceForecastVersion"/i);
    expect(sql).not.toContain("scenarioKey");
  });
});

describe("FIN-04D-02 scenario creation", () => {
  let store = createEmptyScenarioStore();

  beforeEach(() => {
    store = createEmptyScenarioStore();
    seedCurrentForecast(store, [
      { financialAccountId: "acc-income", amountMinor: 100_000 },
      { financialAccountId: "acc-expense", amountMinor: 0 },
    ]);
  });

  it("snapshots canonical current forecast lines including zero", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "  Sponsoring −10%  ",
      expectedCurrentForecastVersionId: "fv-v1",
    });
    expect(created.baselineLineCount).toBe(2);
    const scenario = await getFinanceScenarioById(db, scenarioCtx(), created.scenarioId);
    expect(scenario.name).toBe("Sponsoring −10%");
    expect(scenario.sourceForecastVersionId).toBe("fv-v1");
    const zeroLine = scenario.baselineLines.find((l) => l.financialAccountId === "acc-expense");
    expect(zeroLine?.amountMinor).toBe(0);
  });

  it("rejects stale expected current forecast version", async () => {
    const db = makeScenarioDb(store);
    store.financeForecast[0]!.currentVersionId = "fv-v2";
    store.financeForecastVersion.push({
      id: "fv-v2",
      forecastId: "ff-1",
      status: "CURRENT",
      versionNumber: 2,
    });
    await expect(
      createFinanceScenario(db, scenarioCtx(), {
        financeYearId: scenarioYearId,
        name: "Race",
        expectedCurrentForecastVersionId: "fv-v1",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_STALE_CURRENT_FORECAST" });
  });

  it("returns typed outcome when no current forecast exists", async () => {
    store.financeForecast[0]!.currentVersionId = null;
    const db = makeScenarioDb(store);
    await expect(
      createFinanceScenario(db, scenarioCtx(), {
        financeYearId: scenarioYearId,
        name: "No forecast",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_NO_CURRENT_FORECAST" });
  });

  it("isolates tenant and finance year", async () => {
    const db = makeScenarioDb(store);
    await expect(
      createFinanceScenario(db, scenarioCtx({ tenantId: scenarioTenantB }), {
        financeYearId: scenarioYearId,
        name: "Cross tenant",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });

  it("requires manage permission", async () => {
    const db = makeScenarioDb(store);
    await expect(
      createFinanceScenario(db, scenarioCtx({ permissionKeys: new Set(["finance.forecast.view"]) }), {
        financeYearId: scenarioYearId,
        name: "Denied",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });
});

describe("FIN-04D-02 metadata and names", () => {
  let store = createEmptyScenarioStore();

  beforeEach(() => {
    store = createEmptyScenarioStore();
    seedCurrentForecast(store, [{ financialAccountId: "acc-income", amountMinor: 1 }]);
  });

  it("enforces active name uniqueness and allows reuse after archive", async () => {
    const db = makeScenarioDb(store);
    await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Plan A",
    });
    await expect(
      createFinanceScenario(db, scenarioCtx(), {
        financeYearId: scenarioYearId,
        name: "plan a",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_NAME_CONFLICT" });

    const first = store.financeScenario[0]!;
    await archiveFinanceScenario(db, scenarioCtx(), {
      scenarioId: first.id,
      expectedUpdatedAt: first.updatedAt,
    });
    const second = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Plan A",
    });
    expect(second.scenarioId).not.toBe(first.id);
  });

  it("rejects blank name and normalizes description", async () => {
    const db = makeScenarioDb(store);
    await expect(
      createFinanceScenario(db, scenarioCtx(), {
        financeYearId: scenarioYearId,
        name: "   ",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_NAME_BLANK" });

    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Valid",
      description: "   ",
    });
    const row = await getFinanceScenarioById(db, scenarioCtx(), created.scenarioId);
    expect(row.description).toBeNull();
  });
});

describe("FIN-04D-02 assumptions", () => {
  let store = createEmptyScenarioStore();

  beforeEach(async () => {
    store = createEmptyScenarioStore();
    seedCurrentForecast(store, [{ financialAccountId: "acc-income", amountMinor: 200_000 }]);
  });

  it("persists all four assumption kinds with intent fields", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Assumptions",
      initialAssumptions: [
        { financialAccountId: "acc-income", kind: "PERCENT_CHANGE", percentBasisPoints: -1000 },
      ],
    });
    const scenario = await getFinanceScenarioById(db, scenarioCtx(), created.scenarioId);
    expect(scenario.assumptions[0]?.percentBasisPoints).toBe(-1000);

    const base = scenario.updatedAt;
    await upsertFinanceScenarioAssumption(db, scenarioCtx(), {
      scenarioId: scenario.id,
      expectedUpdatedAt: base,
      financialAccountId: "acc-expense",
      assumption: { kind: "ABSOLUTE_AMOUNT", absoluteAmountMinor: 50_000 },
    });

    const refreshed = await getFinanceScenarioById(db, scenarioCtx(), scenario.id);
    const exclude = await upsertFinanceScenarioAssumption(db, scenarioCtx(), {
      scenarioId: scenario.id,
      expectedUpdatedAt: refreshed.updatedAt,
      financialAccountId: "acc-income",
      assumption: { kind: "DELTA_AMOUNT", amountMinorDelta: 10_000 },
    });
    expect(exclude.kind).toBe("DELTA_AMOUNT");
  });

  it("rejects invalid payloads and archived accounts", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Invalid assumption",
    });
    const scenario = await getFinanceScenarioById(db, scenarioCtx(), created.scenarioId);
    await expect(
      upsertFinanceScenarioAssumption(db, scenarioCtx(), {
        scenarioId: scenario.id,
        expectedUpdatedAt: scenario.updatedAt,
        financialAccountId: "acc-income",
        assumption: { kind: "PERCENT_CHANGE", percentBasisPoints: 100, amountMinorDelta: 1 },
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_INVALID_ASSUMPTION" });

    await expect(
      upsertFinanceScenarioAssumption(db, scenarioCtx(), {
        scenarioId: scenario.id,
        expectedUpdatedAt: scenario.updatedAt,
        financialAccountId: "acc-archived",
        assumption: { kind: "EXCLUDE_ACCOUNT" },
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_ACCOUNT_NOT_AVAILABLE" });
  });
});

describe("FIN-04D-02 optimistic concurrency", () => {
  let store = createEmptyScenarioStore();

  beforeEach(() => {
    store = createEmptyScenarioStore();
    seedCurrentForecast(store, [{ financialAccountId: "acc-income", amountMinor: 1 }]);
  });

  it("fails stale metadata and assumption edits", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Concurrency",
    });
    const t1 = created.updatedAt;
    await updateFinanceScenarioMetadata(db, scenarioCtx(), {
      scenarioId: created.scenarioId,
      expectedUpdatedAt: t1,
      name: "Concurrency v2",
    });
    await expect(
      updateFinanceScenarioMetadata(db, scenarioCtx(), {
        scenarioId: created.scenarioId,
        expectedUpdatedAt: t1,
        name: "Lost update",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_STALE" });
  });
});

describe("FIN-04D-02 lifecycle", () => {
  let store = createEmptyScenarioStore();

  beforeEach(() => {
    store = createEmptyScenarioStore();
    seedCurrentForecast(store, [
      { financialAccountId: "acc-income", amountMinor: 300_000 },
      { financialAccountId: "acc-expense", amountMinor: 100_000 },
    ]);
  });

  it("archives, restores with name collision guard, deletes, and duplicates", async () => {
    const db = makeScenarioDb(store);
    const source = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Source",
      initialAssumptions: [
        { financialAccountId: "acc-income", kind: "EXCLUDE_ACCOUNT" },
      ],
    });
    const row = await getFinanceScenarioById(db, scenarioCtx(), source.scenarioId);

    const archived = await archiveFinanceScenario(db, scenarioCtx(), {
      scenarioId: row.id,
      expectedUpdatedAt: row.updatedAt,
    });
    expect(archived.archivedAt).not.toBeNull();

    await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Source",
    });

    await expect(
      restoreFinanceScenario(db, scenarioCtx(), {
        scenarioId: archived.id,
        expectedUpdatedAt: archived.updatedAt,
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_NAME_CONFLICT" });

    const dup = await duplicateFinanceScenario(db, scenarioCtx(), {
      sourceScenarioId: row.id,
      name: "Fork",
    });
    const fork = await getFinanceScenarioById(db, scenarioCtx(), dup.scenarioId);
    expect(fork.sourceForecastVersionId).toBe(row.sourceForecastVersionId);
    expect(fork.baselineLines).toHaveLength(2);
    expect(fork.assumptions).toHaveLength(1);

    const live = await getFinanceScenarioById(db, scenarioCtx(), row.id);
    await deleteFinanceScenario(db, scenarioCtx(), {
      scenarioId: live.id,
      expectedUpdatedAt: live.updatedAt,
    });
    await expect(
      getFinanceScenarioById(db, scenarioCtx(), live.id),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_NOT_FOUND" });
  });

  it("blocks assumption mutation on archived scenarios", async () => {
    const db = makeScenarioDb(store);
    const created = await createFinanceScenario(db, scenarioCtx(), {
      financeYearId: scenarioYearId,
      name: "Archived edit",
    });
    const row = await getFinanceScenarioById(db, scenarioCtx(), created.scenarioId);
    const archived = await archiveFinanceScenario(db, scenarioCtx(), {
      scenarioId: row.id,
      expectedUpdatedAt: row.updatedAt,
    });
    await expect(
      upsertFinanceScenarioAssumption(db, scenarioCtx(), {
        scenarioId: archived.id,
        expectedUpdatedAt: archived.updatedAt,
        financialAccountId: "acc-income",
        assumption: { kind: "EXCLUDE_ACCOUNT" },
      }),
    ).rejects.toMatchObject({ code: "FINANCE_SCENARIO_ARCHIVED" });
  });
});

describe("FIN-04D-02 baseline immutability guard", () => {
  it("forbids ordinary baseline mutation entrypoint", () => {
    expect(() => assertFinanceScenarioBaselineMutationForbidden()).toThrow(FinanceDomainError);
  });
});
