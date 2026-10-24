import { describe, expect, it } from "vitest";
import { PROJECTION_GERMAN_PRODUCT_TERMS } from "@/lib/finance/projection/projection-architecture-contract";
import { computeProjectionForecastDeltaMinor } from "@/lib/finance/projection/projection-workspace-comparison";
import { computeProjectionAggregateCoverage } from "@/lib/finance/projection/projection-workspace-coverage";
import {
  buildProjectionAccountExplainability,
  buildProjectionWorkspaceViewModel,
  formatProjectionSourceCutoffDate,
  projectionConfidenceLabel,
  projectionDataSufficiencyLabel,
  projectionMethodologyLabel,
  PROJECTION_CONFIDENCE_PRODUCT_TERM,
} from "@/lib/finance/projection/projection-workspace-presentation";

describe("FIN-04B-05 projection coverage helper", () => {
  it("does not treat missing projections as zero in aggregates", () => {
    const coverage = computeProjectionAggregateCoverage([
      {
        accountId: "a1",
        semantic: "INCOME",
        lifecycle: "ACTIVE",
        projectedAmountMinor: 100_000_00,
      },
      {
        accountId: "a2",
        semantic: "INCOME",
        lifecycle: "ACTIVE",
        projectedAmountMinor: null,
      },
      {
        accountId: "e1",
        semantic: "EXPENSE",
        lifecycle: "ACTIVE",
        projectedAmountMinor: 40_000_00,
      },
    ]);
    expect(coverage.income.projectedTotalMinor).toBe(100_000_00);
    expect(coverage.income.complete).toBe(false);
    expect(coverage.result.complete).toBe(false);
    expect(coverage.result.minor).toBeNull();
    expect(coverage.coverageStatus).toBe("PARTIAL");
    expect(coverage.missingProjectionCount).toBe(1);
  });

  it("marks full coverage when every active account is projected", () => {
    const coverage = computeProjectionAggregateCoverage([
      {
        accountId: "a1",
        semantic: "INCOME",
        lifecycle: "ACTIVE",
        projectedAmountMinor: 50_000_00,
      },
      {
        accountId: "e1",
        semantic: "EXPENSE",
        lifecycle: "ACTIVE",
        projectedAmountMinor: 20_000_00,
      },
      {
        accountId: "x1",
        semantic: "INCOME",
        lifecycle: "ARCHIVED",
        projectedAmountMinor: null,
      },
    ]);
    expect(coverage.coverageStatus).toBe("FULL");
    expect(coverage.result.minor).toBe(30_000_00);
  });
});

describe("FIN-04B-05 neutral forecast comparison", () => {
  it("computes projection minus forecast without favorability", () => {
    expect(computeProjectionForecastDeltaMinor(200_000_00, 150_000_00)).toBe(50_000_00);
    expect(computeProjectionForecastDeltaMinor(100_000_00, 150_000_00)).toBe(-50_000_00);
    expect(computeProjectionForecastDeltaMinor(null, 150_000_00)).toBeNull();
  });
});

describe("FIN-04B-05 presentation labels", () => {
  it("maps methodology families to German product labels", () => {
    expect(projectionMethodologyLabel("HISTORICAL_PATTERN")).toBe("Historischer Verlauf");
    expect(projectionMethodologyLabel("RUN_RATE")).toBe("Aktueller Verlauf");
    expect(projectionMethodologyLabel("NONE")).toBeNull();
  });

  it("maps sufficiency and confidence without raw enums", () => {
    expect(projectionDataSufficiencyLabel("SUFFICIENT")).toBe("Gute Datengrundlage");
    expect(projectionDataSufficiencyLabel("LIMITED")).toBe("Begrenzte Datengrundlage");
    expect(projectionDataSufficiencyLabel("INSUFFICIENT")).toBe("Nicht genügend Daten");
    expect(projectionConfidenceLabel("HIGH")).toContain("Prognosesicherheit");
    expect(projectionConfidenceLabel("NONE")).toBeNull();
    expect(PROJECTION_CONFIDENCE_PRODUCT_TERM).toBe("Prognosesicherheit");
  });

  it("formats source cutoff for tenant locale", () => {
    expect(formatProjectionSourceCutoffDate("2026-09-30", "de-CH")).toMatch(/30\.09\.2026/);
  });
});

describe("FIN-04B-05 workspace view-model states", () => {
  const coverageAccounts = [
    {
      accountId: "a1",
      semantic: "INCOME" as const,
      lifecycle: "ACTIVE" as const,
      projectedAmountMinor: null as number | null,
    },
  ];

  it("derives NO_PROJECTION", () => {
    const vm = buildProjectionWorkspaceViewModel({
      financeYearId: "fy1",
      financeYearName: "Saison 2026/27",
      version: null,
      staleness: null,
      lines: [],
      forecastAmountByAccountId: new Map(),
      coverageAccounts,
      explainabilityByAccountId: new Map(),
    });
    expect(vm.presentationState).toBe("NO_PROJECTION");
    expect(vm.financeYearName).toBe("Saison 2026/27");
  });

  it("derives AVAILABLE_FRESH with full coverage", () => {
    const vm = buildProjectionWorkspaceViewModel({
      financeYearId: "fy1",
      financeYearName: "Saison 2026/27",
      version: {
        versionNumber: 1,
        actualsThroughDate: "2026-09-30",
        generatedAt: new Date("2026-10-01T10:00:00.000Z"),
        dataSufficiency: "SUFFICIENT",
        evidenceFingerprint: "fp1",
      },
      staleness: "FRESH",
      lines: [
        {
          financialAccountId: "a1",
          projectedAmountMinor: 100_000_00,
          lowerBoundMinor: null,
          upperBoundMinor: null,
          methodologyFamily: "RUN_RATE",
          dataSufficiency: "SUFFICIENT",
          confidence: "MEDIUM",
        },
      ],
      forecastAmountByAccountId: new Map([["a1", 90_000_00]]),
      coverageAccounts: [
        {
          accountId: "a1",
          semantic: "INCOME",
          lifecycle: "ACTIVE",
          projectedAmountMinor: 100_000_00,
        },
      ],
      explainabilityByAccountId: new Map(),
    });
    expect(vm.presentationState).toBe("AVAILABLE_FRESH");
    expect(vm.accounts[0]?.deltaMinor).toBe(10_000_00);
  });

  it("derives AVAILABLE_STALE", () => {
    const vm = buildProjectionWorkspaceViewModel({
      financeYearId: "fy1",
      financeYearName: "Y",
      version: {
        versionNumber: 1,
        actualsThroughDate: "2026-09-30",
        generatedAt: new Date(),
        dataSufficiency: "SUFFICIENT",
        evidenceFingerprint: "old",
      },
      staleness: "STALE",
      lines: [
        {
          financialAccountId: "a1",
          projectedAmountMinor: 1_000_00,
          lowerBoundMinor: null,
          upperBoundMinor: null,
          methodologyFamily: "RUN_RATE",
          dataSufficiency: "SUFFICIENT",
          confidence: "LOW",
        },
      ],
      forecastAmountByAccountId: new Map(),
      coverageAccounts: [
        { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 1_000_00 },
      ],
      explainabilityByAccountId: new Map(),
    });
    expect(vm.presentationState).toBe("AVAILABLE_STALE");
  });

  it("derives PARTIAL_COVERAGE", () => {
    const vm = buildProjectionWorkspaceViewModel({
      financeYearId: "fy1",
      financeYearName: "Y",
      version: {
        versionNumber: 1,
        actualsThroughDate: "2026-09-30",
        generatedAt: new Date(),
        dataSufficiency: "LIMITED",
        evidenceFingerprint: "fp",
      },
      staleness: "FRESH",
      lines: [
        {
          financialAccountId: "a1",
          projectedAmountMinor: 1_000_00,
          lowerBoundMinor: null,
          upperBoundMinor: null,
          methodologyFamily: "RUN_RATE",
          dataSufficiency: "LIMITED",
          confidence: "LOW",
        },
        {
          financialAccountId: "a2",
          projectedAmountMinor: null,
          lowerBoundMinor: null,
          upperBoundMinor: null,
          methodologyFamily: "NONE",
          dataSufficiency: "INSUFFICIENT",
          confidence: "NONE",
        },
      ],
      forecastAmountByAccountId: new Map(),
      coverageAccounts: [
        { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: 1_000_00 },
        { accountId: "a2", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: null },
      ],
      explainabilityByAccountId: new Map(),
    });
    expect(vm.presentationState).toBe("PARTIAL_COVERAGE");
  });

  it("derives INSUFFICIENT when version has no projected amounts", () => {
    const vm = buildProjectionWorkspaceViewModel({
      financeYearId: "fy1",
      financeYearName: "Y",
      version: {
        versionNumber: 1,
        actualsThroughDate: "2026-09-30",
        generatedAt: new Date(),
        dataSufficiency: "INSUFFICIENT",
        evidenceFingerprint: "fp",
      },
      staleness: "FRESH",
      lines: [],
      forecastAmountByAccountId: new Map(),
      coverageAccounts: [
        { accountId: "a1", semantic: "INCOME", lifecycle: "ACTIVE", projectedAmountMinor: null },
      ],
      explainabilityByAccountId: new Map(),
    });
    expect(vm.presentationState).toBe("INSUFFICIENT");
  });
});

describe("FIN-04B-05 explainability view model", () => {
  it("surfaces known actual, remainder, projection, range, and historical year names", () => {
    const detail = buildProjectionAccountExplainability(
      {
        financialAccountId: "a1",
        projectedAmountMinor: 200_000_00,
        knownActualAmountMinor: 60_000_00,
        estimatedRemainingAmountMinor: 140_000_00,
        methodologyFamily: "HISTORICAL_PATTERN",
        dataSufficiency: "SUFFICIENT",
        sufficiencyReasons: [],
        confidenceLevel: "MEDIUM",
        confidenceRationaleCodes: [],
        lowerBoundMinor: 185_000_00,
        upperBoundMinor: 215_000_00,
        reasonCodes: [],
        materialInfluences: [],
        historicalFinanceYearIdsUsed: ["fy-p1"],
        completedCurrentPeriodCount: 3,
      },
      {
        actualsThroughDate: "2026-09-30",
        historicalFinanceYearNames: ["Saison 2024/25", "Saison 2025/26"],
      },
    );
    expect(detail.methodologyLabel).toBe("Historischer Verlauf");
    expect(detail.knownActualAmountMinor).toBe(60_000_00);
    expect(detail.estimatedRemainingAmountMinor).toBe(140_000_00);
    expect(detail.lowerBoundMinor).toBe(185_000_00);
    expect(detail.historicalFinanceYearNames).toHaveLength(2);
  });
});

describe("FIN-04B-05 canonical terminology guard", () => {
  it("keeps SCE-Projektion distinct from Aktuelle Prognose", () => {
    expect(PROJECTION_GERMAN_PRODUCT_TERMS.sceProjection).toBe("SCE-Projektion");
    expect(PROJECTION_GERMAN_PRODUCT_TERMS.currentForecast).toBe("Aktuelle Prognose");
  });
});
