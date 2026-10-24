import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { assessProjectionAccountConfidence } from "@/lib/finance/projection/projection-confidence";
import { projectionConfidenceExplanation } from "@/lib/finance/projection/projection-confidence-explanation";
import { assessProjectionDataSufficiency } from "@/lib/finance/projection/projection-data-sufficiency";
import { assertValidProjectionLineRange } from "@/lib/finance/projection/projection-range-validation";
import {
  PROJECTION_DATA_SUFFICIENCY_LEVELS,
  PROJECTION_CONFIDENCE_LEVELS,
} from "@/lib/finance/projection/projection-architecture-contract";
import { calculateProjectionForAccount } from "@/lib/finance/projection/projection-account-calculator";
import { computeProjectionEvidenceFingerprint } from "@/lib/finance/projection/projection-evidence-fingerprint";
import { evaluateProjectionEvidenceStaleness } from "@/lib/finance/projection/projection-evidence-staleness";
import type { ProjectionEvidenceContext } from "@/lib/finance/projection/projection-evidence-types";
import { buildProjectionAccountExplainabilityDetail } from "@/lib/finance/projection/projection-workspace-explainability";
import {
  projectionConfidenceLabel,
  projectionDataSufficiencyLabel,
  projectionMethodologyLabel,
} from "@/lib/finance/projection/projection-workspace-presentation";
import { formatFinanceAutomaticForecastMoneyMinor } from "@/lib/finance/projection/projection-amount-presentation";
import { buildProjectionAdoptionPreview } from "@/lib/finance/projection/projection-adoption-policy";
import {
  buildMaterial,
  monthlyUniform,
} from "@/lib/finance/__tests__/finance-04b-04-projection-fixtures";

const accountId = "acc-release";

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

describe("FIN-04B-07 confidence vs data sufficiency separation", () => {
  it("keeps sufficiency and confidence enums distinct", () => {
    expect(new Set(PROJECTION_DATA_SUFFICIENCY_LEVELS).size).toBe(3);
    expect(new Set(PROJECTION_CONFIDENCE_LEVELS).size).toBe(4);
    expect(PROJECTION_DATA_SUFFICIENCY_LEVELS).not.toContain("HIGH");
    expect(PROJECTION_CONFIDENCE_LEVELS).not.toContain("SUFFICIENT");
  });

  it("allows SUFFICIENT evidence with MEDIUM confidence when patterns diverge", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId,
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
    const sufficiency = assessProjectionDataSufficiency(material);
    expect(sufficiency.level).toBe("SUFFICIENT");
    const confidence = assessProjectionAccountConfidence({
      methodologyFamily: "HISTORICAL_PATTERN",
      context: {
        sufficiency,
      } as ProjectionEvidenceContext,
      patternStability: {
        stability: "MODERATE",
        spreadBasisPoints: 2500,
        historicalYearCount: 2,
        shareBasisPointsByYear: [3200, 4800],
      },
      historicalYearsUsed: 2,
    });
    expect(confidence.level).toBe("MEDIUM");
    expect(confidence.level).not.toBe(sufficiency.level);
  });

  it("maps confidence rationale to German explanation without raw enums in UI labels", () => {
    const explanation = projectionConfidenceExplanation({
      level: "LOW",
      rationaleCodes: ["RUN_RATE_CONSERVATIVE"],
      methodologyFamily: "RUN_RATE",
      dataSufficiency: "LIMITED",
    });
    expect(explanation).toMatch(/aktuellen Finanzjahres/i);
    expect(projectionConfidenceLabel("LOW")).not.toMatch(/^LOW$/);
    expect(projectionDataSufficiencyLabel("LIMITED")).not.toMatch(/^LIMITED$/);
    expect(projectionMethodologyLabel("HISTORICAL_PATTERN")).not.toMatch(/^HISTORICAL/);
  });
});

describe("FIN-04B-07 expected range policy", () => {
  it("accepts valid historical range ordering", () => {
    expect(() =>
      assertValidProjectionLineRange({
        projectedAmountMinor: 100_000_00,
        lowerBoundMinor: 90_000_00,
        upperBoundMinor: 110_000_00,
      }),
    ).not.toThrow();
  });

  it("allows absent range", () => {
    expect(() =>
      assertValidProjectionLineRange({
        projectedAmountMinor: 100_000_00,
        lowerBoundMinor: null,
        upperBoundMinor: null,
      }),
    ).not.toThrow();
  });

  it("rejects inverted bounds", () => {
    expect(() =>
      assertValidProjectionLineRange({
        projectedAmountMinor: 100_000_00,
        lowerBoundMinor: 120_000_00,
        upperBoundMinor: 90_000_00,
      }),
    ).toThrow(FinanceDomainError);
  });

  it("does not fabricate run-rate range", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId,
      targetStart: "2027-01-01",
      targetEnd: "2027-06-30",
      cutoff: "2027-03-31",
      currentEntries: monthlyUniform("2027-01-01", 3, 10_000_00),
      priorYears: [],
    });
    const result = calculateProjectionForAccount(toContext(material));
    expect(result.methodologyFamily).toBe("RUN_RATE");
    expect(result.lowerBoundMinor).toBeNull();
    expect(result.upperBoundMinor).toBeNull();
  });
});

describe("FIN-04B-07 zero vs null semantics", () => {
  it("keeps null projection distinct from zero forecast adoption", () => {
    const preview = buildProjectionAdoptionPreview({
      projectionVersionId: "pv-1",
      sourceForecastVersionId: "fv-1",
      accounts: [{ accountId, semantic: "INCOME", lifecycle: "ACTIVE" }],
      projectedAmountByAccountId: new Map([[accountId, null]]),
      currentForecastAmountByAccountId: new Map([[accountId, 0]]),
    });
    expect(preview.eligibleAccountCount).toBe(0);
    const sparse = preview.lines[0];
    expect(sparse?.proposedAmountMinor).toBe(0);
    expect(sparse?.adoptedFromProjection).toBe(false);
  });

  it("adopts legitimate zero projection", () => {
    const preview = buildProjectionAdoptionPreview({
      projectionVersionId: "pv-1",
      sourceForecastVersionId: "fv-1",
      accounts: [{ accountId, semantic: "INCOME", lifecycle: "ACTIVE" }],
      projectedAmountByAccountId: new Map([[accountId, 0]]),
      currentForecastAmountByAccountId: new Map([[accountId, 50_000_00]]),
    });
    expect(preview.eligibleAccountCount).toBe(1);
    expect(preview.persistableLines[0]?.amountMinor).toBe(0);
  });

  it("displays zero automatic forecast in whole currency units", () => {
    expect(formatFinanceAutomaticForecastMoneyMinor(0, "CHF", "de-CH")).toMatch(/0.*CHF/);
  });
});

describe("FIN-04B-07 explainability hardening", () => {
  it("includes confidence explanation for projected accounts", () => {
    const detail = buildProjectionAccountExplainabilityDetail(
      {
        methodologyFamily: "RUN_RATE",
        dataSufficiency: "LIMITED",
        sufficiencyReasons: [],
        confidenceLevel: "LOW",
        confidenceRationaleCodes: ["RUN_RATE_CONSERVATIVE", "LIMITED_EVIDENCE"],
        projectedAmountMinor: 120_000_00,
        knownActualAmountMinor: 30_000_00,
        estimatedRemainingAmountMinor: 90_000_00,
        lowerBoundMinor: null,
        upperBoundMinor: null,
        historicalFinanceYearIdsUsed: [],
        materialInfluences: [],
      },
      { actualsThroughDate: "2027-03-31", historicalFinanceYearNames: [] },
    );
    expect(detail.confidenceExplanation).toBeTruthy();
    expect(detail.narrative).toMatch(/Ist/i);
    expect(detail.insufficientExplanation).toBeNull();
  });

  it("does not leak raw enum names in tenant-facing copy", () => {
    const detail = buildProjectionAccountExplainabilityDetail(
      {
        methodologyFamily: "NONE",
        dataSufficiency: "INSUFFICIENT",
        sufficiencyReasons: ["NO_ACTUAL_HISTORY"],
        confidenceLevel: "NONE",
        confidenceRationaleCodes: ["NO_PROJECTION"],
        projectedAmountMinor: null,
        knownActualAmountMinor: 0,
        estimatedRemainingAmountMinor: null,
        lowerBoundMinor: null,
        upperBoundMinor: null,
        historicalFinanceYearIdsUsed: [],
        materialInfluences: [],
      },
      { actualsThroughDate: "2027-06-30", historicalFinanceYearNames: [] },
    );
    expect(detail.insufficientExplanation).not.toContain("NO_ACTUAL_HISTORY");
    expect(detail.confidenceExplanation).toBeNull();
  });
});

describe("FIN-04B-07 staleness lifecycle", () => {
  it("marks snapshot STALE when evidence fingerprint changes after generation", () => {
    const material = buildMaterial({
      financeYearId: "fy-cur",
      accountId,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-03-31",
      currentEntries: monthlyUniform("2027-01-01", 3, 10_000_00),
      priorYears: [],
    });
    const baseline = toContext(material);
    const staleMaterial = buildMaterial({
      financeYearId: "fy-cur",
      accountId,
      targetStart: "2027-01-01",
      targetEnd: "2027-12-31",
      cutoff: "2027-04-30",
      currentEntries: monthlyUniform("2027-01-01", 4, 10_000_00),
      priorYears: [],
    });
    const current = toContext(staleMaterial);
    expect(
      evaluateProjectionEvidenceStaleness(
        {
          evidenceFingerprint: baseline.evidenceFingerprint,
          actualsThroughDate: "2027-03-31",
        },
        {
          evidenceFingerprint: current.evidenceFingerprint,
          actualsThroughDate: "2027-04-30",
        },
      ),
    ).toBe("STALE");
  });
});

describe("FIN-04B-07 finance year and currency safety", () => {
  it("uses non-calendar finance year boundaries in historical pattern", () => {
    const material = buildMaterial({
      financeYearId: "fy-2627",
      accountId,
      targetStart: "2026-07-01",
      targetEnd: "2027-06-30",
      cutoff: "2026-09-30",
      currentEntries: monthlyUniform("2026-07-01", 3, 20_000_00),
      priorYears: [
        {
          id: "fy-h1",
          start: "2025-07-01",
          end: "2026-06-30",
          entries: monthlyUniform("2025-07-01", 12, 16_667_00),
        },
      ],
    });
    const result = calculateProjectionForAccount(toContext(material));
    expect(result.methodologyFamily).toBe("HISTORICAL_PATTERN");
    expect(result.projectedAmountMinor).not.toBeNull();
  });

  it("formats JPY automatic forecast with whole-major ISO semantics", () => {
    const formatted = formatFinanceAutomaticForecastMoneyMinor(1500, "JPY", "de-CH");
    expect(formatted).toContain("JPY");
    expect(formatted).not.toMatch(/[.,]\d{2}\s/);
  });
});

describe("FIN-04B-07 no LLM numerical forecasting guard", () => {
  it("documents deterministic engine in methodology module", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/finance/projection/projection-engine-version.ts"),
      "utf8",
    );
    expect(source).toContain("sce-projection-v1");
    expect(source.toLowerCase()).not.toContain("openai");
  });
});

describe("FIN-04B-07 accessibility and binary controls", () => {
  it("labels explain trigger for keyboard users", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/admin/finance/FinanceProjectionWorkspaceSection.tsx"),
      "utf8",
    );
    expect(source).toContain('aria-label={t("explainActionShort")}');
    expect(source).not.toContain('type="checkbox"');
  });
});

describe("FIN-04B-07 confidence assessor evidence basis", () => {
  it("returns NONE confidence for NONE methodology", () => {
    const assessed = assessProjectionAccountConfidence({
      methodologyFamily: "NONE",
      context: {
        sufficiency: { level: "INSUFFICIENT", reasonCodes: ["NO_ACTUAL_HISTORY"] },
      } as ProjectionEvidenceContext,
      patternStability: {
        stability: "UNKNOWN",
        spreadBasisPoints: null,
        historicalYearCount: 0,
        shareBasisPointsByYear: [],
      },
      historicalYearsUsed: 0,
    });
    expect(assessed.level).toBe("NONE");
  });
});
