import { describe, expect, it, beforeEach } from "vitest";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { calculateProjectionForAccount } from "@/lib/finance/projection/projection-account-calculator";
import { assessProjectionDataSufficiency } from "@/lib/finance/projection/projection-data-sufficiency";
import { computeProjectionEvidenceFingerprint } from "@/lib/finance/projection/projection-evidence-fingerprint";
import { evaluateProjectionEvidenceStaleness } from "@/lib/finance/projection/projection-evidence-staleness";
import type { ProjectionEvidenceContext } from "@/lib/finance/projection/projection-evidence-types";
import { SCE_PROJECTION_ENGINE_VERSION } from "@/lib/finance/projection/projection-engine-version";
import {
  buildMaterial,
  d,
  entries,
  FIXTURE_TENANT,
  monthlyUniform,
} from "@/lib/finance/__tests__/finance-04b-04-projection-fixtures";
import { generateFinanceYearProjection } from "@/lib/finance/services/finance-projection-generation-service";

const accountA = "acc-a";
const accountB = "acc-b";
const accountC = "acc-c";
const accountArchived = "acc-archived";

function toContext(
  material: ReturnType<typeof buildMaterial>,
  options?: { archived?: boolean },
): ProjectionEvidenceContext {
  const sufficiency = assessProjectionDataSufficiency(material, {
    targetAccountArchived: options?.archived,
  });
  return {
    ...material,
    sufficiency,
    evidenceFingerprint: computeProjectionEvidenceFingerprint(material),
  };
}

function authCtx(): FinanceAuthContext {
  return {
    tenantId: FIXTURE_TENANT,
    userId: "user-1",
    permissionKeys: new Set(["finance.forecast.view", "finance.forecast.manage"]),
  };
}

describe("FIN-04B-04 historical pattern methodology", () => {
  it("uses finance-year-relative Jul–Sep positions for July–June years", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountA,
      targetStart: "2027-07-01",
      targetEnd: "2028-06-30",
      cutoff: "2027-09-30",
      currentEntries: monthlyUniform("2027-07-01", 3, 20_000_00),
      priorYears: [
        {
          id: "fy-h1",
          start: "2026-07-01",
          end: "2027-06-30",
          entries: monthlyUniform("2026-07-01", 12, 16_667_00),
        },
      ],
    });
    const result = calculateProjectionForAccount(toContext(material));
    expect(result.methodologyFamily).toBe("HISTORICAL_PATTERN");
    expect(result.projectedAmountMinor).toBeGreaterThanOrEqual(60_000_00);
    expect(result.knownActualAmountMinor).toBe(60_000_00);
    expect(result.projectedAmountMinor).toBeGreaterThanOrEqual(result.knownActualAmountMinor);
  });

  it("excludes partial current month from seasonal scaling denominator", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountA,
      targetStart: "2027-07-01",
      targetEnd: "2028-06-30",
      cutoff: "2027-10-15",
      currentEntries: [
        ...monthlyUniform("2027-07-01", 3, 20_000_00),
        ...entries([["2027-10-05", 5_000_00]]),
      ],
      priorYears: [
        {
          id: "fy-h1",
          start: "2026-07-01",
          end: "2027-06-30",
          entries: monthlyUniform("2026-07-01", 12, 16_667_00),
        },
      ],
    });
    const result = calculateProjectionForAccount(toContext(material));
    expect(result.knownActualAmountMinor).toBe(65_000_00);
    expect(result.methodologyFamily).toBe("HISTORICAL_PATTERN");
    const withoutPartial = calculateProjectionForAccount(
      toContext(
        buildMaterial({
          financeYearId: "fy-cur",
          accountId: accountA,
          targetStart: "2027-07-01",
          targetEnd: "2028-06-30",
          cutoff: "2027-09-30",
          currentEntries: monthlyUniform("2027-07-01", 3, 20_000_00),
          priorYears: [
            {
              id: "fy-h1",
              start: "2026-07-01",
              end: "2027-06-30",
              entries: monthlyUniform("2026-07-01", 12, 16_667_00),
            },
          ],
        }),
      ),
    );
    expect(result.projectedAmountMinor).toBe(withoutPartial.projectedAmountMinor);
  });

  it("aggregates multiple historical years with median share", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountA,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-03-31",
      currentEntries: monthlyUniform("2027-01-01", 3, 10_000_00),
      priorYears: [
        {
          id: "fy-h1",
          start: "2025-01-01",
          end: "2025-12-31",
          entries: [
            ...monthlyUniform("2025-01-01", 3, 5_000_00),
            ...monthlyUniform("2025-04-01", 9, 15_000_00),
          ],
        },
        {
          id: "fy-h2",
          start: "2026-01-01",
          end: "2026-12-31",
          entries: monthlyUniform("2026-01-01", 12, 10_000_00),
        },
      ],
    });
    const result = calculateProjectionForAccount(toContext(material));
    expect(result.methodologyFamily).toBe("HISTORICAL_PATTERN");
    expect(result.historicalFinanceYearIdsUsed.length).toBeGreaterThanOrEqual(2);
    expect(result.projectedAmountMinor).not.toBeNull();
  });
});

describe("FIN-04B-04 run rate methodology", () => {
  it("applies only with sufficient elapsed finance-year time", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountA,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-01-07",
      currentEntries: entries([["2027-01-05", 1_000_00]]),
      priorYears: [],
    });
    const result = calculateProjectionForAccount(toContext(material));
    expect(result.methodologyFamily).toBe("NONE");
    expect(result.projectedAmountMinor).toBeNull();
  });

  it("annualises using finance-year day coverage", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountA,
      targetStart: "2027-01-01",
      targetEnd: "2027-06-30",
      cutoff: "2027-03-31",
      currentEntries: monthlyUniform("2027-01-01", 3, 10_000_00),
      priorYears: [],
    });
    const result = calculateProjectionForAccount(toContext(material));
    expect(result.methodologyFamily).toBe("RUN_RATE");
    expect(result.confidenceLevel).toBe("LOW");
    expect(result.projectedAmountMinor).toBeGreaterThanOrEqual(result.knownActualAmountMinor);
  });
});

describe("FIN-04B-04 no projection", () => {
  it("returns null amount without substituting zero", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountA,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-06-30",
      currentEntries: [],
      priorYears: [],
      budgetAmount: 500_000_00,
      forecastAmount: 400_000_00,
    });
    const result = calculateProjectionForAccount(toContext(material));
    expect(result.projectedAmountMinor).toBeNull();
    expect(result.methodologyFamily).toBe("NONE");
    expect(result.confidenceLevel).toBe("NONE");
  });

  it("archived accounts produce no projection", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountArchived,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-03-31",
      currentEntries: monthlyUniform("2027-01-01", 3, 10_000_00),
      priorYears: [],
    });
    const result = calculateProjectionForAccount(toContext(material, { archived: true }));
    expect(result.projectedAmountMinor).toBeNull();
  });
});

describe("FIN-04B-04 per-account methodology within one generation", () => {
  it("selects different methodologies per account", () => {
    const histMaterial = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountA,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-03-31",
      currentEntries: monthlyUniform("2027-01-01", 3, 10_000_00),
      priorYears: [
        {
          id: "fy-h1",
          start: "2026-01-01",
          end: "2026-12-31",
          entries: monthlyUniform("2026-01-01", 12, 10_000_00),
        },
      ],
    });
    const sparseMaterial = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountC,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-06-30",
      currentEntries: [],
      priorYears: [],
    });
    const runRateMaterial = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountB,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-03-31",
      currentEntries: monthlyUniform("2027-01-01", 3, 8_000_00),
      priorYears: [],
    });
    const a = calculateProjectionForAccount(toContext(histMaterial));
    const b = calculateProjectionForAccount(toContext(runRateMaterial));
    const c = calculateProjectionForAccount(toContext(sparseMaterial));
    expect(a.methodologyFamily).toBe("HISTORICAL_PATTERN");
    expect(b.methodologyFamily).toBe("RUN_RATE");
    expect(c.methodologyFamily).toBe("NONE");
  });
});

describe("FIN-04B-04 confidence", () => {
  it("does not assign HIGH confidence for a single historical year", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId: accountA,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-03-31",
      currentEntries: monthlyUniform("2027-01-01", 3, 10_000_00),
      priorYears: [
        {
          id: "fy-h1",
          start: "2026-01-01",
          end: "2026-12-31",
          entries: monthlyUniform("2026-01-01", 12, 10_000_00),
        },
      ],
    });
    const result = calculateProjectionForAccount(toContext(material));
    expect(result.confidenceLevel).not.toBe("HIGH");
  });
});

describe("FIN-04B-04 generation orchestrator (in-memory)", () => {
  type Store = {
    financeConfiguration: Array<{ tenantId: string; baseCurrency: string }>;
    financeYear: Array<{ id: string; tenantId: string; name: string; startDate: Date; endDate: Date }>;
    financialAccount: Array<{
      id: string;
      tenantId: string;
      canonicalSemantic: string;
      lifecycle: "ACTIVE" | "ARCHIVED";
    }>;
    financeActualEntry: Array<{
      tenantId: string;
      financeYearId: string;
      financialAccountId: string;
      effectiveDate: Date;
      amountMinor: number;
      currency: string;
    }>;
    financeProjection: Array<{
      id: string;
      tenantId: string;
      financeYearId: string;
      currentProjectionVersionId: string | null;
    }>;
    financeProjectionVersion: Array<Record<string, unknown>>;
    financeProjectionLine: Array<Record<string, unknown>>;
    financeProjectionEvidence: Array<Record<string, unknown>>;
    financeProjectionReasonCode: Array<Record<string, unknown>>;
    financeForecast: unknown[];
    financeForecastVersion: unknown[];
    financeForecastLine: unknown[];
    financeBudget: unknown[];
    financeBudgetVersion: unknown[];
    financeBudgetLine: unknown[];
  };

  let store: Store;

  beforeEach(() => {
    store = {
      financeConfiguration: [{ tenantId: FIXTURE_TENANT, baseCurrency: "EUR" }],
      financeYear: [
        {
          id: "fy-cur",
          tenantId: FIXTURE_TENANT,
          name: "FY",
          startDate: d("2027-01-01"),
          endDate: d("2027-12-31"),
        },
        {
          id: "fy-h1",
          tenantId: FIXTURE_TENANT,
          name: "H1",
          startDate: d("2026-01-01"),
          endDate: d("2026-12-31"),
        },
      ],
      financialAccount: [
        { id: accountA, tenantId: FIXTURE_TENANT, canonicalSemantic: "INCOME", lifecycle: "ACTIVE" },
        { id: accountB, tenantId: FIXTURE_TENANT, canonicalSemantic: "EXPENSE", lifecycle: "ACTIVE" },
      ],
      financeActualEntry: [
        ...monthlyUniform("2027-01-01", 3, 10_000_00).map((e) => ({
          tenantId: FIXTURE_TENANT,
          financeYearId: "fy-cur",
          financialAccountId: accountA,
          effectiveDate: e.effectiveDate,
          amountMinor: e.amountMinor,
          currency: "EUR",
        })),
        ...monthlyUniform("2026-01-01", 12, 10_000_00).map((e) => ({
          tenantId: FIXTURE_TENANT,
          financeYearId: "fy-h1",
          financialAccountId: accountA,
          effectiveDate: e.effectiveDate,
          amountMinor: e.amountMinor,
          currency: "EUR",
        })),
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
      financeBudgetLine: [],
    };
  });

  function makeDb(storeRef: Store) {
    let projSeq = 0;
    let verSeq = 0;
    let lineSeq = 0;
    return {
      financeConfiguration: {
        findUnique: async ({ where }: { where: { tenantId: string } }) =>
          storeRef.financeConfiguration.find((c) => c.tenantId === where.tenantId) ?? null,
      },
      financeYear: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          storeRef.financeYear.find((y) => y.id === where.id) ?? null,
        findMany: async ({ where }: { where: { tenantId: string } }) =>
          storeRef.financeYear.filter((y) => y.tenantId === where.tenantId),
      },
      financialAccount: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          storeRef.financialAccount.find((a) => a.id === where.id) ?? null,
        findMany: async ({ where }: { where: { tenantId: string } }) =>
          storeRef.financialAccount.filter((a) => a.tenantId === where.tenantId),
      },
      financeActualEntry: {
        findMany: async () => storeRef.financeActualEntry,
      },
      financeBudget: { findUnique: async () => null },
      financeBudgetVersion: {},
      financeBudgetLine: {},
      financeForecast: { findUnique: async () => null },
      financeForecastVersion: {},
      financeForecastLine: {},
      financeProjection: {
        findUnique: async ({
          where,
          include,
        }: {
          where:
            | { tenantId_financeYearId: { tenantId: string; financeYearId: string } }
            | { id: string };
          include?: { versions?: { orderBy?: { versionNumber: "desc" }; take?: number } };
        }) => {
          const projection =
            "tenantId_financeYearId" in where
              ? storeRef.financeProjection.find(
                  (p) =>
                    p.tenantId === where.tenantId_financeYearId.tenantId &&
                    p.financeYearId === where.tenantId_financeYearId.financeYearId,
                )
              : storeRef.financeProjection.find((p) => p.id === where.id);
          if (!projection) return null;
          const versions = storeRef.financeProjectionVersion
            .filter((v) => v.financeProjectionId === projection.id)
            .sort((a, b) => (b.versionNumber as number) - (a.versionNumber as number));
          return {
            ...projection,
            versions: include?.versions ? versions.slice(0, include.versions.take ?? versions.length) : undefined,
          };
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          projSeq += 1;
          const id = `proj-${projSeq}`;
          storeRef.financeProjection.push({
            id,
            tenantId: data.tenantId as string,
            financeYearId: data.financeYearId as string,
            currentProjectionVersionId: null,
          });
          return { id, ...data, versions: [] };
        },
        update: async ({ where, data }: { where: { id: string }; data: { currentProjectionVersionId: string } }) => {
          const row = storeRef.financeProjection.find((p) => p.id === where.id)!;
          row.currentProjectionVersionId = data.currentProjectionVersionId;
          return row;
        },
      },
      financeProjectionVersion: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          storeRef.financeProjectionVersion.find((v) => v.id === where.id) ?? null,
        create: async ({ data }: { data: Record<string, unknown> & { lines?: { create: unknown[] } } }) => {
          verSeq += 1;
          const id = `ver-${verSeq}`;
          storeRef.financeProjectionVersion.push({ id, ...data });
          const linesCreate = data.lines as { create: Array<Record<string, unknown>> } | undefined;
          if (linesCreate?.create) {
            for (const line of linesCreate.create) {
              lineSeq += 1;
              storeRef.financeProjectionLine.push({ id: `line-${lineSeq}`, projectionVersionId: id, ...line });
            }
          }
          return { id, ...data };
        },
        update: async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
          const row = storeRef.financeProjectionVersion.find((v) => v.id === where.id)!;
          row.status = data.status;
          return row;
        },
      },
      financeProjectionLine: {},
      financeProjectionEvidence: {},
      financeProjectionReasonCode: {},
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(makeDb(storeRef)),
    };
  }

  it("persists per-line methodology and MIXED version when needed", async () => {
    store.financeActualEntry.push(
      ...monthlyUniform("2027-01-01", 3, 5_000_00).map((e) => ({
        tenantId: FIXTURE_TENANT,
        financeYearId: "fy-cur",
        financialAccountId: accountB,
        effectiveDate: e.effectiveDate,
        amountMinor: e.amountMinor,
        currency: "EUR",
      })),
    );
    const db = makeDb(store);
    const result = await generateFinanceYearProjection(db as never, authCtx(), {
      financeYearId: "fy-cur",
      actualsThroughDate: "2027-03-31",
      financialAccountIds: [accountA, accountB],
    });
    expect(result.engineVersion).toBe(SCE_PROJECTION_ENGINE_VERSION);
    const version = store.financeProjectionVersion.find((v) => v.id === result.projectionVersionId)!;
    expect(version.methodologyFamily).toBe("MIXED");
    const lines = store.financeProjectionLine.filter((l) => l.projectionVersionId === result.projectionVersionId);
    expect(lines).toHaveLength(2);
    const methodologies = new Set(lines.map((l) => l.methodologyFamily));
    expect(methodologies.size).toBeGreaterThan(1);
  });

  it("marks prior version stale after evidence change and supersedes on regenerate", async () => {
    const db = makeDb(store);
    const v1 = await generateFinanceYearProjection(db as never, authCtx(), {
      financeYearId: "fy-cur",
      actualsThroughDate: "2027-03-31",
      financialAccountIds: [accountA],
    });
    const fp1 = v1.accountResults[0]!.projectedAmountMinor;
    store.financeActualEntry.push({
      tenantId: FIXTURE_TENANT,
      financeYearId: "fy-cur",
      financialAccountId: accountA,
      effectiveDate: d("2027-04-10"),
      amountMinor: 50_000_00,
      currency: "EUR",
    });
    const v1Row = store.financeProjectionVersion.find((v) => v.id === v1.projectionVersionId)!;
    expect(
      evaluateProjectionEvidenceStaleness(
        {
          evidenceFingerprint: v1Row.evidenceFingerprint as string,
          actualsThroughDate: "2027-03-31",
        },
        {
          evidenceFingerprint: "evidence-changed",
          actualsThroughDate: "2027-03-31",
        },
      ),
    ).toBe("STALE");
    const v2 = await generateFinanceYearProjection(db as never, authCtx(), {
      financeYearId: "fy-cur",
      actualsThroughDate: "2027-04-30",
      financialAccountIds: [accountA],
    });
    expect(v2.versionNumber).toBe(2);
    expect(v2.supersededVersionId).toBe(v1.projectionVersionId);
    const oldVersion = store.financeProjectionVersion.find((v) => v.id === v1.projectionVersionId)!;
    expect(oldVersion.status).toBe("SUPERSEDED");
    expect(v2.accountResults[0]!.projectedAmountMinor).not.toBe(fp1);
  });
});
