import { describe, expect, it } from "vitest";
import {
  assessFinanceReportingActualEvidenceReconciliation,
  buildFinanceReportingInvestigationInterpretation,
  isOpaqueFinanceActualEntryDescription,
  resolveFinanceActualEntryDescriptionPresentation,
} from "@/lib/finance/presentation/finance-reporting-investigation-presentation";

describe("finance reporting investigation presentation", () => {
  describe("actual entry description", () => {
    it("treats meaningful user descriptions as displayable", () => {
      expect(resolveFinanceActualEntryDescriptionPresentation("Mitgliedsbeitrag Q1")).toEqual({
        kind: "MEANINGFUL",
        text: "Mitgliedsbeitrag Q1",
      });
    });

    it("hides absent descriptions", () => {
      expect(resolveFinanceActualEntryDescriptionPresentation(null)).toEqual({ kind: "ABSENT" });
      expect(resolveFinanceActualEntryDescriptionPresentation("   ")).toEqual({ kind: "ABSENT" });
    });

    it("does not expose generic machine-like pipe metadata", () => {
      const opaque = "SCE_FIN_04B_UAT_DATA_01|MITGLIED_HISTORICAL_PATTERN|2026-01";
      expect(isOpaqueFinanceActualEntryDescription(opaque)).toBe(true);
      expect(resolveFinanceActualEntryDescriptionPresentation(opaque)).toEqual({ kind: "ABSENT" });
    });

    it("does not special-case only one fixture string", () => {
      expect(isOpaqueFinanceActualEntryDescription("FIXTURE|ACCOUNT|001")).toBe(true);
      expect(isOpaqueFinanceActualEntryDescription("AUTO_GEN_REF_998877665544")).toBe(true);
    });
  });

  describe("interpretation", () => {
    const baseSlice = {
      availability: "AVAILABLE" as const,
      baselineMinor: 100_00,
      comparisonMinor: 110_00,
      rawDeltaMinor: 10_00,
      variancePercent: 10,
      favorability: "FAVORABLE" as const,
      absoluteVarianceMagnitudeMinor: 10_00,
    };

    it("builds above-budget interpretation when forecast exceeds budget", () => {
      const result = buildFinanceReportingInvestigationInterpretation({
        forecastVsBudget: baseSlice,
        baseCurrency: "CHF",
        locale: "de-CH",
      });
      expect(result).toMatchObject({ kind: "FORECAST_VS_BUDGET", direction: "ABOVE" });
    });

    it("builds below-budget interpretation for negative delta", () => {
      const result = buildFinanceReportingInvestigationInterpretation({
        forecastVsBudget: { ...baseSlice, rawDeltaMinor: -5_00 },
        baseCurrency: "CHF",
        locale: "de-CH",
      });
      expect(result).toMatchObject({ direction: "BELOW" });
    });

    it("returns unavailable when comparison missing", () => {
      const result = buildFinanceReportingInvestigationInterpretation({
        forecastVsBudget: {
          ...baseSlice,
          availability: "BOTH_MISSING",
          rawDeltaMinor: null,
        },
        baseCurrency: "CHF",
        locale: "de-CH",
      });
      expect(result).toEqual({ kind: "UNAVAILABLE" });
    });

    it("handles on-plan zero delta", () => {
      const result = buildFinanceReportingInvestigationInterpretation({
        forecastVsBudget: { ...baseSlice, rawDeltaMinor: 0, favorability: "ON_PLAN" },
        baseCurrency: "CHF",
        locale: "de-CH",
      });
      expect(result).toMatchObject({ direction: "ON_PLAN" });
    });
  });

  describe("evidence reconciliation", () => {
    it("reconciles when entry sum matches actual", () => {
      const result = assessFinanceReportingActualEvidenceReconciliation({
        actual: { availability: "AVAILABLE", amountMinor: 300_00 },
        entries: [{ amountMinor: 100_00 }, { amountMinor: 200_00 }],
      });
      expect(result).toEqual({
        kind: "RECONCILES",
        entryCount: 2,
        entriesTotalMinor: 300_00,
      });
    });

    it("does not claim reconciliation when totals differ", () => {
      const result = assessFinanceReportingActualEvidenceReconciliation({
        actual: { availability: "AVAILABLE", amountMinor: 300_00 },
        entries: [{ amountMinor: 100_00 }],
      });
      expect(result).toEqual({ kind: "NOT_RECONCILING" });
    });
  });
});
