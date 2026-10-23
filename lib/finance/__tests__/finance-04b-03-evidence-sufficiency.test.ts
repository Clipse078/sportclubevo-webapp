import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import {
  buildFinanceYearActualObservations,
  findCutoffRelativePeriodIndex,
} from "@/lib/finance/projection/projection-actual-observations";
import { assessProjectionDataSufficiency } from "@/lib/finance/projection/projection-data-sufficiency";
import { computeProjectionEvidenceFingerprint } from "@/lib/finance/projection/projection-evidence-fingerprint";
import { evaluateProjectionEvidenceStaleness } from "@/lib/finance/projection/projection-evidence-staleness";
import { buildProjectionEvidenceMaterial } from "@/lib/finance/projection/projection-evidence-material-builder";
import {
  buildProjectionEvidenceContextFromBundle,
  getProjectionEvidenceContextForFinanceYearAccounts,
  loadProjectionEvidenceLoaderBundle,
} from "@/lib/finance/services/finance-projection-evidence-service";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const year2027 = "fy-2027";
const year2026 = "fy-2026";
const accountId = "acc-1";

function authCtx(): FinanceAuthContext {
  return {
    tenantId: tenantA,
    userId: "user-1",
    permissionKeys: new Set(["finance.forecast.view"]),
  };
}

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function baseMaterial(overrides?: Partial<Parameters<typeof buildProjectionEvidenceMaterial>[0]>) {
  const targetYear = {
    id: year2027,
    tenantId: tenantA,
    name: "FY arbitrary label 2027/28",
    startDate: d("2027-07-01"),
    endDate: d("2028-06-30"),
  };
  return buildProjectionEvidenceMaterial({
    tenantId: tenantA,
    financeYearId: year2027,
    financialAccountId: accountId,
    currency: "CHF",
    actualsThroughDate: d("2027-10-15"),
    actualsThroughDateIso: "2027-10-15",
    targetYear,
    priorYears: [
      {
        id: year2026,
        tenantId: tenantA,
        name: "FY 2026",
        startDate: d("2026-07-01"),
        endDate: d("2027-06-30"),
      },
    ],
    actualEntriesByYearId: new Map(),
    budgetContext: null,
    forecastContext: null,
    ...overrides,
  });
}

describe("FIN-04B-03 finance-year-relative actual observations", () => {
  const julyYear = {
    startDate: d("2026-07-01"),
    endDate: d("2027-06-30"),
  };

  it("uses July as relative index 0 for July–June finance years", () => {
    const series = buildFinanceYearActualObservations({
      financeYearId: year2026,
      financeYearName: "FY",
      year: julyYear,
      actualsThroughDate: d("2027-06-30"),
      entries: [{ effectiveDate: d("2026-07-10"), amountMinor: 100 }],
    });
    expect(series.observations[0]!.relativePeriodIndex).toBe(0);
    expect(series.observations[0]!.amountMinor).toBe(100);
  });

  it("respects tenant-defined boundaries and partial first month", () => {
    const partial = {
      startDate: d("2026-07-15"),
      endDate: d("2027-06-30"),
    };
    const series = buildFinanceYearActualObservations({
      financeYearId: year2026,
      financeYearName: "FY",
      year: partial,
      actualsThroughDate: d("2027-06-30"),
      entries: [{ effectiveDate: d("2026-07-20"), amountMinor: 50 }],
    });
    expect(series.observations[0]!.periodStartDate).toBe("2026-07-15");
    expect(series.observations[0]!.amountMinor).toBe(50);
  });

  it("excludes actuals after cutoff", () => {
    const series = buildFinanceYearActualObservations({
      financeYearId: year2027,
      financeYearName: "FY",
      year: julyYear,
      actualsThroughDate: d("2026-08-31"),
      entries: [
        { effectiveDate: d("2026-07-10"), amountMinor: 100 },
        { effectiveDate: d("2026-09-05"), amountMinor: 999 },
      ],
    });
    expect(series.observations[0]!.amountMinor).toBe(100);
    expect(series.observations[2]!.amountMinor).toBeNull();
  });

  it("distinguishes zero evidence from missing periods", () => {
    const series = buildFinanceYearActualObservations({
      financeYearId: year2027,
      financeYearName: "FY",
      year: julyYear,
      actualsThroughDate: d("2027-06-30"),
      entries: [{ effectiveDate: d("2026-08-01"), amountMinor: 0 }],
    });
    const august = series.observations[1]!;
    expect(august.amountMinor).toBe(0);
    expect(august.completeness).toBe("COMPLETE");
    expect(series.observations[0]!.amountMinor).toBeNull();
    expect(series.observations[0]!.completeness).toBe("NO_DATA");
  });

  it("marks partial current period at mid-month cutoff", () => {
    const series = buildFinanceYearActualObservations({
      financeYearId: year2027,
      financeYearName: "FY",
      year: { startDate: d("2027-07-01"), endDate: d("2028-06-30") },
      actualsThroughDate: d("2027-10-15"),
      entries: [{ effectiveDate: d("2027-10-10"), amountMinor: 40 }],
    });
    const october = series.observations[3]!;
    expect(october.completeness).toBe("PARTIAL");
    expect(findCutoffRelativePeriodIndex(series, d("2027-10-15"))).toBe(3);
  });

  it("orders historical years by dates in material builder", () => {
    const material = baseMaterial({
      priorYears: [
        {
          id: "fy-old",
          tenantId: tenantA,
          name: "Z last label",
          startDate: d("2025-07-01"),
          endDate: d("2026-06-30"),
        },
        {
          id: year2026,
          tenantId: tenantA,
          name: "A first label",
          startDate: d("2026-07-01"),
          endDate: d("2027-06-30"),
        },
      ],
      actualEntriesByYearId: new Map([
        [year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 1 }]],
        [year2026, [{ effectiveDate: d("2026-08-01"), amountMinor: 2 }]],
        ["fy-old", [{ effectiveDate: d("2025-08-01"), amountMinor: 3 }]],
      ]),
    });
    expect(material.historicalActuals.map((s) => s.financeYearId)).toEqual(["fy-old", year2026]);
  });
});

describe("FIN-04B-03 budget and forecast context", () => {
  it("keeps budget and forecast distinct from actual evidence kinds", () => {
    const material = baseMaterial({
      actualEntriesByYearId: new Map([[year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 10 }]]]),
      budgetContext: {
        kind: "BUDGET_BASELINE",
        financeYearId: year2027,
        financialAccountId: accountId,
        budgetVersionId: "bv-1",
        amountMinor: 175_000,
        currency: "CHF",
      },
      forecastContext: {
        kind: "CURRENT_FORECAST",
        financeYearId: year2027,
        financialAccountId: accountId,
        forecastVersionId: "fv-1",
        amountMinor: 180_000,
        currency: "CHF",
      },
    });
    expect(material.evidenceKindsPresent).toContain("CURRENT_YEAR_ACTUALS");
    expect(material.evidenceKindsPresent).toContain("BUDGET_BASELINE");
    expect(material.evidenceKindsPresent).toContain("CURRENT_FORECAST");
    const sufficiency = assessProjectionDataSufficiency(material);
    expect(sufficiency.level).not.toBe("SUFFICIENT");
  });
});

describe("FIN-04B-03 data sufficiency", () => {
  it("returns INSUFFICIENT with NO_ACTUAL_HISTORY when empty", () => {
    const material = baseMaterial();
    const result = assessProjectionDataSufficiency(material);
    expect(result.level).toBe("INSUFFICIENT");
    expect(result.reasonCodes).toContain("NO_ACTUAL_HISTORY");
  });

  it("does not fabricate projected amounts (sufficiency only)", () => {
    const material = baseMaterial();
    expect(material).not.toHaveProperty("projectedAmountMinor");
  });

  it("treats zero actual as evidence", () => {
    const material = baseMaterial({
      actualEntriesByYearId: new Map([[year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 0 }]]]),
    });
    const result = assessProjectionDataSufficiency(material);
    expect(result.level).not.toBe("INSUFFICIENT");
    expect(result.reasonCodes).not.toContain("NO_ACTUAL_HISTORY");
  });

  it("budget alone does not yield SUFFICIENT", () => {
    const material = baseMaterial({
      budgetContext: {
        kind: "BUDGET_BASELINE",
        financeYearId: year2027,
        financialAccountId: accountId,
        budgetVersionId: "bv-1",
        amountMinor: 175_000,
        currency: "CHF",
      },
    });
    expect(assessProjectionDataSufficiency(material).level).toBe("INSUFFICIENT");
  });

  it("forecast alone does not yield SUFFICIENT", () => {
    const material = baseMaterial({
      forecastContext: {
        kind: "CURRENT_FORECAST",
        financeYearId: year2027,
        financialAccountId: accountId,
        forecastVersionId: "fv-1",
        amountMinor: 180_000,
        currency: "CHF",
      },
    });
    expect(assessProjectionDataSufficiency(material).level).toBe("INSUFFICIENT");
  });

  it("marks archived target accounts INSUFFICIENT", () => {
    const material = baseMaterial({
      actualEntriesByYearId: new Map([
        [year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 10 }]],
        [year2026, [{ effectiveDate: d("2026-08-01"), amountMinor: 10 }]],
      ]),
    });
    const result = assessProjectionDataSufficiency(material, { targetAccountArchived: true });
    expect(result.level).toBe("INSUFFICIENT");
    expect(result.reasonCodes).toContain("ACCOUNT_ARCHIVED");
  });

  it("returns LIMITED for sparse current-year-only history", () => {
    const material = baseMaterial({
      priorYears: [],
      actualEntriesByYearId: new Map([[year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 10 }]]]),
    });
    expect(assessProjectionDataSufficiency(material).level).toBe("LIMITED");
  });

  it("returns SUFFICIENT with meaningful historical coverage", () => {
    const entries2026 = Array.from({ length: 6 }, (_, i) => ({
      effectiveDate: d(`2026-${String(7 + i).padStart(2, "0")}-05`),
      amountMinor: 100 + i,
    }));
    const entries2027 = Array.from({ length: 4 }, (_, i) => ({
      effectiveDate: d(`2027-${String(7 + i).padStart(2, "0")}-05`),
      amountMinor: 200 + i,
    }));
    const material = baseMaterial({
      actualEntriesByYearId: new Map([
        [year2027, entries2027],
        [year2026, entries2026],
      ]),
    });
    expect(assessProjectionDataSufficiency(material).level).toBe("SUFFICIENT");
  });

  it("partial period does not count as complete in metrics", () => {
    const material = baseMaterial({
      actualEntriesByYearId: new Map([[year2027, [{ effectiveDate: d("2027-10-10"), amountMinor: 5 }]]]),
    });
    const metrics = assessProjectionDataSufficiency(material).metrics;
    expect(metrics.currentYearCompletePeriodCount).toBe(0);
  });
});

describe("FIN-04B-03 evidence fingerprint and staleness", () => {
  it("is stable for identical evidence", () => {
    const material = baseMaterial({
      actualEntriesByYearId: new Map([[year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 10 }]]]),
    });
    const a = computeProjectionEvidenceFingerprint(material);
    const b = computeProjectionEvidenceFingerprint(material);
    expect(a).toBe(b);
  });

  it("is stable regardless of observation iteration order", () => {
    const material = baseMaterial({
      actualEntriesByYearId: new Map([
        [
          year2027,
          [
            { effectiveDate: d("2027-09-01"), amountMinor: 2 },
            { effectiveDate: d("2027-08-01"), amountMinor: 1 },
          ],
        ],
      ]),
    });
    const shuffled = baseMaterial({
      actualEntriesByYearId: new Map([
        [
          year2027,
          [
            { effectiveDate: d("2027-08-01"), amountMinor: 1 },
            { effectiveDate: d("2027-09-01"), amountMinor: 2 },
          ],
        ],
      ]),
    });
    expect(computeProjectionEvidenceFingerprint(material)).toBe(
      computeProjectionEvidenceFingerprint(shuffled),
    );
  });

  it("changes when actual amount changes", () => {
    const m1 = baseMaterial({
      actualEntriesByYearId: new Map([[year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 10 }]]]),
    });
    const m2 = baseMaterial({
      actualEntriesByYearId: new Map([[year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 11 }]]]),
    });
    expect(computeProjectionEvidenceFingerprint(m1)).not.toBe(computeProjectionEvidenceFingerprint(m2));
  });

  it("ignores finance year display name", () => {
    const m1 = baseMaterial({
      targetYear: {
        id: year2027,
        tenantId: tenantA,
        name: "Name A",
        startDate: d("2027-07-01"),
        endDate: d("2028-06-30"),
      },
      actualEntriesByYearId: new Map([[year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 1 }]]]),
    });
    const m2 = baseMaterial({
      targetYear: {
        id: year2027,
        tenantId: tenantA,
        name: "Name B",
        startDate: d("2027-07-01"),
        endDate: d("2028-06-30"),
      },
      actualEntriesByYearId: new Map([[year2027, [{ effectiveDate: d("2027-08-01"), amountMinor: 1 }]]]),
    });
    expect(computeProjectionEvidenceFingerprint(m1)).toBe(computeProjectionEvidenceFingerprint(m2));
  });

  it("evaluates FRESH vs STALE read-only", () => {
    const fp = createHash("sha256").update("demo", "utf8").digest("hex");
    expect(
      evaluateProjectionEvidenceStaleness(
        { evidenceFingerprint: fp, actualsThroughDate: "2027-10-15" },
        { evidenceFingerprint: fp, actualsThroughDate: "2027-10-15" },
      ),
    ).toBe("FRESH");
    expect(
      evaluateProjectionEvidenceStaleness(
        { evidenceFingerprint: fp, actualsThroughDate: "2027-10-15" },
        { evidenceFingerprint: "other", actualsThroughDate: "2027-10-15" },
      ),
    ).toBe("STALE");
  });
});

describe("FIN-04B-03 service boundary", () => {
  it("rejects cross-tenant account in bundle build", () => {
    const bundle = {
      years: [
        {
          id: year2027,
          tenantId: tenantA,
          name: "FY",
          startDate: d("2027-07-01"),
          endDate: d("2028-06-30"),
        },
      ],
      entriesByYearAccount: new Map(),
      budgetByYearId: new Map([[year2027, null]]),
      forecastByYearId: new Map([[year2027, null]]),
      accounts: new Map([["acc-b", { tenantId: tenantB, lifecycle: "ACTIVE" as const }]]),
    };
    expect(() =>
      buildProjectionEvidenceContextFromBundle(bundle, authCtx(), {
        financeYearId: year2027,
        financialAccountId: "acc-b",
        actualsThroughDate: "2027-10-15",
        currency: "CHF",
      }),
    ).toThrow(FinanceDomainError);
  });

  it("batch loader uses bounded queries for multi-account extraction", async () => {
    const findManyActual = vi.fn().mockResolvedValue([]);
    const db = {
      financeConfiguration: {
        findUnique: vi.fn().mockResolvedValue({ baseCurrency: "CHF" }),
      },
      financeYear: {
        findUnique: vi.fn().mockResolvedValue({
          id: year2027,
          tenantId: tenantA,
          name: "FY",
          startDate: d("2027-07-01"),
          endDate: d("2028-06-30"),
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: year2027,
            tenantId: tenantA,
            name: "FY",
            startDate: d("2027-07-01"),
            endDate: d("2028-06-30"),
          },
        ]),
      },
      financialAccount: {
        findMany: vi.fn().mockResolvedValue([
          { id: "a1", tenantId: tenantA, lifecycle: "ACTIVE" },
          { id: "a2", tenantId: tenantA, lifecycle: "ACTIVE" },
        ]),
      },
      financeActualEntry: { findMany: findManyActual },
      financeBudget: { findUnique: vi.fn().mockResolvedValue(null) },
      financeForecast: { findUnique: vi.fn().mockResolvedValue(null) },
    };

    await loadProjectionEvidenceLoaderBundle(db as never, authCtx(), {
      financeYearId: year2027,
      actualsThroughDate: "2027-10-15",
    });
    expect(findManyActual).toHaveBeenCalledTimes(1);

    await getProjectionEvidenceContextForFinanceYearAccounts(db as never, authCtx(), {
      financeYearId: year2027,
      actualsThroughDate: "2027-10-15",
      financialAccountIds: ["a1", "a2"],
    });
    expect(findManyActual).toHaveBeenCalledTimes(2);
  });
});
