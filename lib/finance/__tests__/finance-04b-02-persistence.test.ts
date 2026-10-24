import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { assertValidProjectionLineRange } from "@/lib/finance/projection/projection-range-validation";
import {
  assertProjectionVersionIsNotMutated,
  generateProjectionSnapshot,
  resolveCurrentProjectionVersionForYear,
} from "@/lib/finance/services/finance-projection-service";
const tenantA = "tenant-a";
const tenantB = "tenant-b";
const yearId = "fy-2026";
const accountIncome = "acc-income";
const accountExpense = "acc-expense";

function projectionCtx(overrides?: Partial<FinanceAuthContext>): FinanceAuthContext {
  return {
    tenantId: tenantA,
    userId: "user-1",
    permissionKeys: new Set(["finance.forecast.view", "finance.forecast.manage"]),
    ...overrides,
  };
}

type ProjectionStore = {
  financeConfiguration: Array<{ tenantId: string; baseCurrency: string | null }>;
  financeYear: Array<{ id: string; tenantId: string; name: string }>;
  financialAccount: Array<{
    id: string;
    tenantId: string;
    canonicalSemantic: string;
    lifecycle: "ACTIVE" | "ARCHIVED";
  }>;
  financeProjection: Array<{
    id: string;
    tenantId: string;
    financeYearId: string;
    currentProjectionVersionId: string | null;
  }>;
  financeProjectionVersion: Array<{
    id: string;
    financeProjectionId: string;
    status: "CURRENT" | "SUPERSEDED";
    versionNumber: number;
    currency: string;
    actualsThroughDate: Date;
    methodologyFamily: string;
    engineVersion: string;
    dataSufficiency: string;
    confidence: string;
    evidenceFingerprint: string | null;
  }>;
  financeProjectionLine: Array<{
    id: string;
    projectionVersionId: string;
    financialAccountId: string;
    projectedAmountMinor: number | null;
    lowerBoundMinor: number | null;
    upperBoundMinor: number | null;
    methodologyFamily: string;
    dataSufficiency: string;
    confidence: string;
  }>;
  financeProjectionEvidence: Array<Record<string, unknown>>;
  financeProjectionReasonCode: Array<Record<string, unknown>>;
  financeForecast: Array<{
    id: string;
    tenantId: string;
    financeYearId: string;
    currentVersionId: string | null;
  }>;
  financeForecastVersion: Array<{
    id: string;
    forecastId: string;
    status: "CURRENT" | "SUPERSEDED";
    versionNumber: number;
    scenarioKey: string | null;
  }>;
  financeForecastLine: Array<{
    id: string;
    forecastVersionId: string;
    financialAccountId: string;
    amountMinor: number;
  }>;
  financeBudget: unknown[];
  financeBudgetVersion: unknown[];
  financeBudgetLine: unknown[];
  financeActualEntry: unknown[];
};

function makeProjectionDb(store: ProjectionStore) {
  let projectionSeq = 0;
  let versionSeq = 0;
  let lineSeq = 0;
  let evidenceSeq = 0;
  let reasonSeq = 0;

  const db = {
    financeConfiguration: {
      findUnique: async ({ where }: { where: { tenantId: string } }) =>
        store.financeConfiguration.find((c) => c.tenantId === where.tenantId) ?? null,
    },
    financeYear: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financeYear.find((y) => y.id === where.id) ?? null,
    },
    financialAccount: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.financialAccount.find((a) => a.id === where.id) ?? null,
    },
    financeProjection: {
      findUnique: async ({
        where,
        include,
      }: {
        where:
          | { tenantId_financeYearId: { tenantId: string; financeYearId: string } }
          | { id: string };
        include?: {
          currentProjectionVersion?: { include?: { lines?: boolean; evidence?: boolean; reasonCodes?: boolean } };
          versions?: { orderBy?: { versionNumber: "desc" }; take?: number };
        };
      }) => {
        const projection =
          "tenantId_financeYearId" in where
            ? store.financeProjection.find(
                (p) =>
                  p.tenantId === where.tenantId_financeYearId.tenantId &&
                  p.financeYearId === where.tenantId_financeYearId.financeYearId,
              )
            : store.financeProjection.find((p) => p.id === where.id);
        if (!projection) return null;
        const versions = store.financeProjectionVersion
          .filter((v) => v.financeProjectionId === projection.id)
          .sort((a, b) => b.versionNumber - a.versionNumber);
        const currentProjectionVersion = projection.currentProjectionVersionId
          ? store.financeProjectionVersion.find((v) => v.id === projection.currentProjectionVersionId)
          : null;
        return {
          ...projection,
          versions: include?.versions ? versions.slice(0, include.versions.take ?? versions.length) : undefined,
          currentProjectionVersion: include?.currentProjectionVersion
            ? {
                ...currentProjectionVersion,
                lines: store.financeProjectionLine.filter(
                  (l) => l.projectionVersionId === currentProjectionVersion?.id,
                ),
                evidence: store.financeProjectionEvidence.filter(
                  (e) => e.projectionVersionId === currentProjectionVersion?.id,
                ),
                reasonCodes: store.financeProjectionReasonCode.filter(
                  (r) => r.projectionVersionId === currentProjectionVersion?.id,
                ),
              }
            : currentProjectionVersion,
        };
      },
      findUniqueOrThrow: async (args: Parameters<typeof db.financeProjection.findUnique>[0]) => {
        const row = await db.financeProjection.findUnique(args);
        if (!row) throw new Error("not found");
        return row;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        projectionSeq += 1;
        const id = `proj-${projectionSeq}`;
        store.financeProjection.push({
          id,
          tenantId: data.tenantId as string,
          financeYearId: data.financeYearId as string,
          currentProjectionVersionId: null,
        });
        return { id, ...data, currentProjectionVersionId: null };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { currentProjectionVersionId?: string };
      }) => {
        const row = store.financeProjection.find((p) => p.id === where.id)!;
        if (data.currentProjectionVersionId !== undefined) {
          row.currentProjectionVersionId = data.currentProjectionVersionId;
        }
        return row;
      },
    },
    financeProjectionVersion: {
      findUnique: async ({ where, include }: { where: { id: string }; include?: unknown }) => {
        const version = store.financeProjectionVersion.find((v) => v.id === where.id);
        if (!version || !include) return version ?? null;
        const financeProjection = store.financeProjection.find(
          (p) => p.id === version.financeProjectionId,
        )!;
        return { ...version, financeProjection };
      },
      create: async ({ data }: { data: Record<string, unknown> & { lines?: { create: unknown[] }; evidence?: { create: unknown[] }; reasonCodes?: { create: unknown[] } } }) => {
        versionSeq += 1;
        const id = `pversion-${versionSeq}`;
        store.financeProjectionVersion.push({
          id,
          financeProjectionId: data.financeProjectionId as string,
          status: (data.status as "CURRENT") ?? "CURRENT",
          versionNumber: data.versionNumber as number,
          currency: data.currency as string,
          actualsThroughDate: data.actualsThroughDate as Date,
          methodologyFamily: data.methodologyFamily as string,
          engineVersion: data.engineVersion as string,
          dataSufficiency: data.dataSufficiency as string,
          confidence: data.confidence as string,
          evidenceFingerprint: (data.evidenceFingerprint as string | null) ?? null,
        });
        const linesCreate = data.lines as { create: Array<Record<string, unknown>> } | undefined;
        if (linesCreate?.create) {
          for (const line of linesCreate.create) {
            const dup = store.financeProjectionLine.some(
              (l) =>
                l.projectionVersionId === id &&
                l.financialAccountId === line.financialAccountId,
            );
            if (dup) {
              const err = new Error("unique") as Error & { code: string };
              err.code = "P2002";
              throw err;
            }
            lineSeq += 1;
            store.financeProjectionLine.push({
              id: `pline-${lineSeq}`,
              projectionVersionId: id,
              financialAccountId: line.financialAccountId as string,
              projectedAmountMinor: (line.projectedAmountMinor as number | null) ?? null,
              lowerBoundMinor: (line.lowerBoundMinor as number | null) ?? null,
              upperBoundMinor: (line.upperBoundMinor as number | null) ?? null,
              methodologyFamily: (line.methodologyFamily as string) ?? "NONE",
              dataSufficiency: (line.dataSufficiency as string) ?? "INSUFFICIENT",
              confidence: (line.confidence as string) ?? "NONE",
            });
          }
        }
        const evidenceCreate = data.evidence as { create: Array<Record<string, unknown>> } | undefined;
        if (evidenceCreate?.create) {
          for (const row of evidenceCreate.create) {
            evidenceSeq += 1;
            store.financeProjectionEvidence.push({ id: `pev-${evidenceSeq}`, projectionVersionId: id, ...row });
          }
        }
        const reasonCreate = data.reasonCodes as { create: Array<Record<string, unknown>> } | undefined;
        if (reasonCreate?.create) {
          for (const row of reasonCreate.create) {
            reasonSeq += 1;
            store.financeProjectionReasonCode.push({ id: `prc-${reasonSeq}`, projectionVersionId: id, ...row });
          }
        }
        return { id, ...data };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status?: "SUPERSEDED" };
      }) => {
        const row = store.financeProjectionVersion.find((v) => v.id === where.id)!;
        if (data.status) row.status = data.status;
        return row;
      },
    },
    financeProjectionLine: {},
    financeProjectionEvidence: {},
    financeProjectionReasonCode: {},
    financeForecast: {
      findUnique: async () => null,
    },
    financeForecastVersion: {},
    financeForecastLine: {},
    financeBudget: {},
    financeBudgetVersion: {},
    financeBudgetLine: {},
    financeActualEntry: {},
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
  };
  return db;
}

function seedBaseStore(): ProjectionStore {
  return {
    financeConfiguration: [{ tenantId: tenantA, baseCurrency: "EUR" }],
    financeYear: [
      { id: yearId, tenantId: tenantA, name: "FY 2026/27" },
      { id: "fy-other-tenant", tenantId: tenantB, name: "Other tenant year" },
    ],
    financialAccount: [
      {
        id: accountIncome,
        tenantId: tenantA,
        canonicalSemantic: "INCOME",
        lifecycle: "ACTIVE",
      },
      {
        id: accountExpense,
        tenantId: tenantA,
        canonicalSemantic: "EXPENSE",
        lifecycle: "ACTIVE",
      },
      {
        id: "acc-archived",
        tenantId: tenantA,
        canonicalSemantic: "INCOME",
        lifecycle: "ARCHIVED",
      },
      { id: "acc-tenant-b", tenantId: tenantB, canonicalSemantic: "INCOME", lifecycle: "ACTIVE" },
    ],
    financeProjection: [],
    financeProjectionVersion: [],
    financeProjectionLine: [],
    financeProjectionEvidence: [],
    financeProjectionReasonCode: [],
    financeForecast: [],
    financeForecastVersion: [],
    financeForecastLine: [],
    financeBudget: [],
    financeBudgetVersion: [],
    financeActualEntry: [],
  };
}

describe("FIN-04B-02 projection persistence lifecycle", () => {
  let store: ProjectionStore;

  beforeEach(() => {
    store = seedBaseStore();
  });

  it("creates one projection container per tenant/year and v1 CURRENT on first generation", async () => {
    const db = makeProjectionDb(store);
    const result = await generateProjectionSnapshot(db, projectionCtx(), {
      financeYearId: yearId,
      currency: "EUR",
      actualsThroughDate: "2026-06-30",
      methodologyFamily: "BASELINE_REFERENCE",
      engineVersion: "stub-0.1.0",
      dataSufficiency: "SUFFICIENT",
      confidence: "MEDIUM",
      lines: [projectionLine({ projectedAmountMinor: 50_000_00 })],
    });
    expect(result.versionNumber).toBe(1);
    expect(store.financeProjection).toHaveLength(1);
    expect(store.financeProjection[0]!.currentProjectionVersionId).toBe(result.projectionVersionId);
    const version = store.financeProjectionVersion[0]!;
    expect(version.status).toBe("CURRENT");
    expect(version.methodologyFamily).toBe("BASELINE_REFERENCE");
    expect(version.engineVersion).toBe("stub-0.1.0");
    expect(version.actualsThroughDate.toISOString()).toContain("2026-06-30");
  });

  it("supersedes prior CURRENT on second generation and preserves historical v1", async () => {
    const db = makeProjectionDb(store);
    const ctx = projectionCtx();
    const first = await generateProjectionSnapshot(db, ctx, baseGenerationInput());
    const second = await generateProjectionSnapshot(db, ctx, {
      ...baseGenerationInput(),
      lines: [projectionLine({ projectedAmountMinor: 60_000_00 })],
    });
    expect(second.versionNumber).toBe(2);
    expect(second.supersededVersionId).toBe(first.projectionVersionId);
    const v1 = store.financeProjectionVersion.find((v) => v.id === first.projectionVersionId)!;
    expect(v1.status).toBe("SUPERSEDED");
    expect(v1.versionNumber).toBe(1);
    expect(store.financeProjection[0]!.currentProjectionVersionId).toBe(second.projectionVersionId);
    const current = await resolveCurrentProjectionVersionForYear(db, ctx, yearId);
    expect(current?.versionNumber).toBe(2);
  });

  it("rejects cross-tenant finance year and account references", async () => {
    const db = makeProjectionDb(store);
    await expect(
      generateProjectionSnapshot(db, projectionCtx(), {
        ...baseGenerationInput(),
        financeYearId: "fy-other-tenant",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });

    await expect(
      generateProjectionSnapshot(db, projectionCtx(), {
        ...baseGenerationInput(),
        lines: [projectionLine({ financialAccountId: "acc-tenant-b", projectedAmountMinor: 1_00 })],
      }),
    ).rejects.toMatchObject({ code: "FINANCE_CROSS_TENANT" });
  });

  it("rejects currency mismatch with tenant base currency", async () => {
    const db = makeProjectionDb(store);
    await expect(
      generateProjectionSnapshot(db, projectionCtx(), {
        ...baseGenerationInput(),
        currency: "USD",
      }),
    ).rejects.toMatchObject({ code: "FINANCE_PROJECTION_CURRENCY_MISMATCH" });
  });

  it("validates optional ranges and rejects invalid ranges", () => {
    expect(() =>
      assertValidProjectionLineRange({
        projectedAmountMinor: 100,
        lowerBoundMinor: null,
        upperBoundMinor: 200,
      }),
    ).toThrow(FinanceDomainError);
    assertValidProjectionLineRange({
      projectedAmountMinor: 150,
      lowerBoundMinor: 100,
      upperBoundMinor: 200,
    });
    assertValidProjectionLineRange({
      projectedAmountMinor: null,
      lowerBoundMinor: null,
      upperBoundMinor: null,
    });
  });

  it("keeps sufficiency independent from confidence and allows INSUFFICIENT without numeric lines", async () => {
    const db = makeProjectionDb(store);
    await generateProjectionSnapshot(db, projectionCtx(), {
      financeYearId: yearId,
      currency: "EUR",
      actualsThroughDate: "2026-01-31",
      methodologyFamily: "NONE",
      engineVersion: "stub-0.1.0",
      dataSufficiency: "INSUFFICIENT",
      confidence: "HIGH",
      sufficiencyReasons: ["NO_ACTUAL_HISTORY"],
      lines: [],
    });
    const version = store.financeProjectionVersion[0]!;
    expect(version.dataSufficiency).toBe("INSUFFICIENT");
    expect(version.confidence).toBe("HIGH");
    expect(store.financeProjectionLine).toHaveLength(0);

    await expect(
      generateProjectionSnapshot(db, projectionCtx(), {
        financeYearId: yearId,
        currency: "EUR",
        actualsThroughDate: "2026-01-31",
        methodologyFamily: "NONE",
        engineVersion: "stub-0.1.0",
        dataSufficiency: "INSUFFICIENT",
        confidence: "NONE",
        lines: [projectionLine({ projectedAmountMinor: 1_00 })],
      }),
    ).rejects.toMatchObject({ code: "FINANCE_PROJECTION_INSUFFICIENT_WITH_AMOUNTS" });
  });

  it("persists structured evidence and reason codes", async () => {
    const db = makeProjectionDb(store);
    await generateProjectionSnapshot(db, projectionCtx(), {
      ...baseGenerationInput(),
      evidenceFingerprint: "fp-abc",
      evidence: [
        {
          kind: "CURRENT_YEAR_ACTUALS",
          financeYearId: yearId,
          financialAccountId: accountIncome,
          observationsCount: 12,
          fromDate: "2025-07-01",
          throughDate: "2026-06-30",
          fingerprint: "ev-fp",
        },
      ],
      sufficiencyReasons: ["SPARSE_ACCOUNT_HISTORY"],
      confidenceRationaleCodes: ["VOLATILE_TREND"],
    });
    expect(store.financeProjectionEvidence).toHaveLength(1);
    expect(store.financeProjectionReasonCode.length).toBeGreaterThanOrEqual(2);
    expect(store.financeProjectionVersion[0]!.evidenceFingerprint).toBe("fp-abc");
  });

  it("rejects duplicate account lines and blocks public mutation of snapshots", async () => {
    const db = makeProjectionDb(store);
    const created = await generateProjectionSnapshot(db, projectionCtx(), baseGenerationInput());
    await expect(
      generateProjectionSnapshot(db, projectionCtx(), {
        ...baseGenerationInput(),
        lines: [
          projectionLine({ projectedAmountMinor: 1_00 }),
          projectionLine({ projectedAmountMinor: 2_00 }),
        ],
      }),
    ).rejects.toMatchObject({ code: "P2002" });

    await expect(
      assertProjectionVersionIsNotMutated(db, projectionCtx(), created.projectionVersionId),
    ).rejects.toMatchObject({ code: "FINANCE_PROJECTION_IMMUTABLE" });
  });

  it("does not mutate forecast, budget, or actual stores during projection generation", async () => {
    const db = makeProjectionDb(store);
    store.financeForecast.push({
      id: "fc-1",
      tenantId: tenantA,
      financeYearId: yearId,
      currentVersionId: "fv-1",
    });
    store.financeForecastVersion.push({
      id: "fv-1",
      forecastId: "fc-1",
      status: "CURRENT",
      versionNumber: 1,
      scenarioKey: null,
    });
    store.financeForecastLine.push({
      id: "fl-1",
      forecastVersionId: "fv-1",
      financialAccountId: accountIncome,
      amountMinor: 10_000_00,
    });
    const forecastBefore = structuredClone(store.financeForecastLine);
    await generateProjectionSnapshot(db, projectionCtx(), baseGenerationInput());
    expect(store.financeForecastLine).toEqual(forecastBefore);
    expect(store.financeBudget).toHaveLength(0);
    expect(store.financeActualEntry).toHaveLength(0);
  });

  it("allows archived accounts in historical line references (generation may include archived account id)", async () => {
    const db = makeProjectionDb(store);
    await generateProjectionSnapshot(db, projectionCtx(), {
      ...baseGenerationInput(),
      lines: [projectionLine({ financialAccountId: "acc-archived", projectedAmountMinor: 500_00 })],
    });
    expect(store.financeProjectionLine[0]!.financialAccountId).toBe("acc-archived");
  });

  it("treats missing projected amount separately from zero", async () => {
    const db = makeProjectionDb(store);
    await generateProjectionSnapshot(db, projectionCtx(), {
      ...baseGenerationInput(),
      dataSufficiency: "LIMITED",
      confidence: "LOW",
      lines: [
        projectionLine({
          projectedAmountMinor: null,
          methodologyFamily: "NONE",
          dataSufficiency: "LIMITED",
          confidence: "LOW",
        }),
      ],
    });
    expect(store.financeProjectionLine[0]!.projectedAmountMinor).toBeNull();
  });

  it("uses FinanceYear id — name is presentation-only", async () => {
    const db = makeProjectionDb(store);
    await generateProjectionSnapshot(db, projectionCtx(), baseGenerationInput());
    expect(store.financeProjection[0]!.financeYearId).toBe(yearId);
    expect(store.financeYear.find((y) => y.id === yearId)!.name).toBe("FY 2026/27");
  });
});

function projectionLine(
  overrides?: Partial<{
    financialAccountId: string;
    projectedAmountMinor: number | null;
    methodologyFamily: string;
    dataSufficiency: string;
    confidence: string;
  }>,
) {
  return {
    financialAccountId: accountIncome,
    projectedAmountMinor: 50_000_00,
    methodologyFamily: "BASELINE_REFERENCE",
    dataSufficiency: "SUFFICIENT",
    confidence: "MEDIUM",
    ...overrides,
  };
}

function baseGenerationInput() {
  return {
    financeYearId: yearId,
    currency: "EUR",
    actualsThroughDate: "2026-06-30",
    methodologyFamily: "BASELINE_REFERENCE" as const,
    engineVersion: "stub-0.1.0",
    dataSufficiency: "SUFFICIENT" as const,
    confidence: "MEDIUM" as const,
    lines: [projectionLine()],
  };
}

describe("FIN-04B-02 projection vs forecast separation (schema guard)", () => {
  it("does not attach scenarioKey to projection persistence", () => {
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    const versionBlock = schema.match(
      /model FinanceProjectionVersion \{[\s\S]*?\n\}/,
    )?.[0];
    expect(versionBlock).toBeDefined();
    expect(versionBlock).not.toContain("scenarioKey");
  });
});
