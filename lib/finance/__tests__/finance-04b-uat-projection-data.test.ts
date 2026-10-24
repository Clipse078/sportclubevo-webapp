import { describe, expect, it } from "vitest";
import {
  DEFAULT_UAT_ACTUALS_THROUGH_DATE,
  STAGE_CANONICAL_DATABASE_FINGERPRINT,
  UAT_DATA_MARKER,
  UAT_EXECUTE_CONFIRMATION,
  buildUatEntryPlan,
  deriveHistoricalFinanceYearSpec,
  distributeAnnualAmount,
  evaluateStageIdentity,
  isUatManagedDescription,
  parseUatCliMode,
  parseUatDescription,
  resolveTargetAccountsByScenario,
  snapshotsEqual,
  uatDescriptionFor,
} from "@/lib/finance/uat/sce-finance-04b-uat-projection-data";

describe("FIN-04B UAT projection data tooling", () => {
  it("defaults CLI mode to inspect", () => {
    expect(parseUatCliMode([])).toBe("inspect");
    expect(parseUatCliMode(["--inspect"])).toBe("inspect");
    expect(parseUatCliMode(["--apply"])).toBe("apply");
    expect(parseUatCliMode(["--cleanup"])).toBe("cleanup");
  });

  it("requires verified STAGE fingerprint for mutation identity", () => {
    if (process.env.DATABASE_URL?.includes("ep-wispy-hall-aso93dy6")) {
      const report = evaluateStageIdentity({
        APP_ENV: "stage",
        SCE_DATA_ENVIRONMENT: "STAGE",
        SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
        DATABASE_URL: process.env.DATABASE_URL,
      });
      expect(report.stageIdentityVerified).toBe(true);
    } else {
      const report = evaluateStageIdentity({
        APP_ENV: "stage",
        SCE_DATA_ENVIRONMENT: "STAGE",
        SCE_DATA_DATABASE_FINGERPRINT: "0000000000000000",
        DATABASE_URL: process.env.DATABASE_URL,
      });
      expect(report.stageIdentityVerified).toBe(false);
    }
    expect(evaluateStageIdentity({ APP_ENV: "prod", SCE_DATA_ENVIRONMENT: "PRODUCTION" }).productionTouched).toBe(
      "NO",
    );
  });

  it("rejects production APP_ENV", () => {
    const report = evaluateStageIdentity({
      APP_ENV: "prod",
      SCE_DATA_ENVIRONMENT: "PRODUCTION",
      SCE_DATA_DATABASE_FINGERPRINT: STAGE_CANONICAL_DATABASE_FINGERPRINT,
      DATABASE_URL: "postgresql://localhost:5432/neondb",
    });
    expect(report.stageIdentityVerified).toBe(false);
  });

  it("maps historical finance years from FY 2026 structure", () => {
    const target = {
      name: "FY 2026",
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      endDate: new Date("2027-06-30T00:00:00.000Z"),
    };
    const fy2024 = deriveHistoricalFinanceYearSpec(target, 2024);
    expect(fy2024.name).toBe("FY 2024");
    expect(fy2024.startDate.toISOString().slice(0, 10)).toBe("2024-07-01");
    expect(fy2024.endDate.toISOString().slice(0, 10)).toBe("2025-06-30");
  });

  it("distributes amountMinor across finance-year months without negative amounts", () => {
    const year = {
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    };
    const weights = Array.from({ length: 12 }, () => Math.floor(10_000 / 12));
    weights[11]! += 10_000 - weights.reduce((a, b) => a + b, 0);
    const rows = distributeAnnualAmount({
      year,
      annualTotalMinor: 205_000_00,
      monthWeightBasisPoints: weights,
    });
    expect(rows).toHaveLength(12);
    expect(rows.every((r) => r.amountMinor >= 0)).toBe(true);
    expect(rows.reduce((s, r) => s + r.amountMinor, 0)).toBe(205_000_00);
  });

  it("builds deterministic idempotent UAT descriptions", () => {
    const description = uatDescriptionFor({
      scenario: "BETRIEB_RUN_RATE",
      accountName: "Betrieb",
      effectiveDateIso: "2026-03-15",
      amountMinor: 12_000_00,
    });
    expect(isUatManagedDescription(description)).toBe(true);
    expect(parseUatDescription(description)?.amountMinor).toBe(12_000_00);
    expect(description.startsWith(UAT_DATA_MARKER)).toBe(true);
  });

  it("resolves FC Allschwil target accounts including Beispeil typo", () => {
    const resolved = resolveTargetAccountsByScenario([
      { name: "Mitgliedsbeiträge", canonicalSemantic: "INCOME", lifecycle: "ACTIVE" },
      { name: "Personal", canonicalSemantic: "EXPENSE", lifecycle: "ACTIVE" },
      { name: "Betrieb", canonicalSemantic: "EXPENSE", lifecycle: "ACTIVE" },
      { name: "Weitere Einnahmen", canonicalSemantic: "INCOME", lifecycle: "ACTIVE" },
      { name: "Beispeil X", canonicalSemantic: "INCOME", lifecycle: "ACTIVE" },
    ]);
    expect(resolved.BEISPIEL_SPARSE).toBe("Beispeil X");
  });

  it("plans scenario matrix shapes", () => {
    const target = {
      name: "FY 2026",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    };
    const historical = [
      {
        name: "FY 2024",
        startDate: new Date("2024-01-01T00:00:00.000Z"),
        endDate: new Date("2024-12-31T00:00:00.000Z"),
      },
      {
        name: "FY 2025",
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        endDate: new Date("2025-12-31T00:00:00.000Z"),
      },
    ];
    const plan = buildUatEntryPlan({
      targetFinanceYear: target,
      historicalYears: historical,
      resolvedAccountNames: {
        MITGLIED_HISTORICAL_PATTERN: "Mitgliedsbeiträge",
        PERSONAL_HISTORICAL_PATTERN: "Personal",
        BETRIEB_RUN_RATE: "Betrieb",
        WEITERE_INSUFFICIENT: "Weitere Einnahmen",
        BEISPIEL_SPARSE: "Beispeil X",
      },
      actualsThroughDateIso: DEFAULT_UAT_ACTUALS_THROUGH_DATE,
    });
    const byScenario = plan.reduce<Record<string, number>>((acc, row) => {
      acc[row.scenario] = (acc[row.scenario] ?? 0) + 1;
      return acc;
    }, {});
    expect(byScenario.WEITERE_INSUFFICIENT ?? 0).toBe(0);
    expect(byScenario.BEISPIEL_SPARSE).toBe(1);
    expect(byScenario.BETRIEB_RUN_RATE).toBeGreaterThanOrEqual(2);
    expect(byScenario.MITGLIED_HISTORICAL_PATTERN).toBeGreaterThan(10);
    const uniqueDescriptions = new Set(plan.map((p) => p.description));
    expect(uniqueDescriptions.size).toBe(plan.length);
  });

  it("detects unchanged budget/forecast snapshots", () => {
    const lines = [{ accountName: "Personal", amountMinor: 500_000_00 }];
    expect(snapshotsEqual(lines, [...lines])).toBe(true);
    expect(snapshotsEqual(lines, [{ accountName: "Personal", amountMinor: 1 }])).toBe(false);
  });

  it("documents apply confirmation token", () => {
    expect(UAT_EXECUTE_CONFIRMATION).toBe("SCE-FIN-04B-UAT-DATA-01-APPLY");
  });
});
