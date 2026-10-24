import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildForecastEvolutionChartPoints,
  formatForecastEvolutionPointSecondaryMeta,
  resolveForecastEvolutionPointHeadline,
} from "@/lib/finance/forecast/forecast-evolution-presentation";
import type { FinanceForecastHistoryEntry } from "@/lib/finance/forecast/forecast-history-read-model";
import {
  buildForecastHistoryDisplayMetadata,
  buildForecastHistoryRowSecondaryLine,
  joinForecastMetadataTokens,
} from "@/lib/finance/forecast/forecast-revision-presentation";
import {
  formatFinanceManagementMoneyMinor,
  roundAmountMinorToWholeMajorPresentation,
} from "@/lib/finance/presentation/finance-money-presentation";

const rolling = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastRollingUxSections.tsx"),
  "utf8",
);
const evolutionChart = readFileSync(
  join(process.cwd(), "components/admin/finance/forecast/FinanceForecastEvolutionChart.tsx"),
  "utf8",
);
const driverBars = readFileSync(
  join(process.cwd(), "components/admin/finance/forecast/FinanceForecastChangeDriverBars.tsx"),
  "utf8",
);

function historyEntry(
  partial: Partial<FinanceForecastHistoryEntry> & Pick<FinanceForecastHistoryEntry, "forecastVersionId">,
): FinanceForecastHistoryEntry {
  return {
    versionNumber: 1,
    status: "CURRENT",
    isCurrent: false,
    isHistorical: true,
    revisionSource: null,
    revisionLabel: null,
    asOfDate: null,
    actualsThroughDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    createdByUserId: null,
    actor: null,
    previousVersionId: null,
    sourceProjectionVersionId: null,
    lineCount: 1,
    totalIncomeMinor: 100_000_00,
    totalExpenseMinor: 40_000_00,
    resultMinor: 60_000_00,
    presentation: {
      displayTitle: "Frühere Prognose",
      displaySubtitle: "Version 1",
      revisionSourceLabel: "Prognose",
    },
    ...partial,
  };
}

describe("FIN-04C-05R3 visual polish closure", () => {
  describe("revision metadata", () => {
    it("does not duplicate identical metadata tokens", () => {
      expect(joinForecastMetadataTokens(["Version 2", "Version 2"])).toBe("Version 2");
      expect(joinForecastMetadataTokens(["Datenstand 30.09.2026", "Version 3", "Version 3"])).toBe(
        "Datenstand 30.09.2026 · Version 3",
      );
    });

    it("builds legacy secondary line with version once", () => {
      const meta = buildForecastHistoryDisplayMetadata({
        revisionLabel: null,
        revisionSource: null,
        asOfDate: null,
        versionNumber: 2,
        isCurrent: true,
      });
      const line = buildForecastHistoryRowSecondaryLine({
        displayTitle: meta.displayTitle,
        displaySubtitle: meta.displaySubtitle,
        revisionSourceLabel: meta.revisionSourceLabel,
        revisionLabel: null,
        revisionSource: null,
      });
      expect(line).toBe("Version 2");
      expect(line).not.toMatch(/Version 2 · Version 2/);
    });

    it("composes richer label date and version without duplication", () => {
      const meta = buildForecastHistoryDisplayMetadata({
        revisionLabel: "Q3 Review",
        revisionSource: "MANUAL_REFORECAST",
        asOfDate: new Date("2026-09-30T00:00:00.000Z"),
        versionNumber: 3,
        isCurrent: true,
      });
      expect(meta.displayTitle).toBe("Q3 Review");
      expect(meta.displaySubtitle).toContain("Datenstand");
      expect(meta.displaySubtitle).toContain("2026-09-30");
      expect(meta.displaySubtitle).toContain("Version 3");
      const line = buildForecastHistoryRowSecondaryLine({
        displayTitle: meta.displayTitle,
        displaySubtitle: meta.displaySubtitle,
        revisionSourceLabel: meta.revisionSourceLabel,
        revisionLabel: "Q3 Review",
        revisionSource: "MANUAL_REFORECAST",
      });
      expect(line).not.toMatch(/Version 3 · Version 3/);
    });

    it("rolling UX uses centralized secondary metadata helper", () => {
      expect(rolling).toContain("buildForecastHistoryRowSecondaryLine");
      expect(rolling).not.toMatch(/\{" · "\}\s*\n\s*\{props\.t\("versionMeta"/);
    });
  });

  describe("prognoseentwicklung evolution", () => {
    it("handles one revision without connector semantics", () => {
      const points = buildForecastEvolutionChartPoints([
        historyEntry({ forecastVersionId: "only", isCurrent: true, versionNumber: 1 }),
      ]);
      expect(points).toHaveLength(1);
      expect(evolutionChart).toContain("showConnector = props.points.length >= 2");
    });

    it("orders multiple revisions chronologically and marks current", () => {
      const points = buildForecastEvolutionChartPoints([
        historyEntry({
          forecastVersionId: "v1",
          versionNumber: 1,
          resultMinor: 150_000_00,
          presentation: {
            displayTitle: "Frühere Prognose",
            displaySubtitle: "Version 1",
            revisionSourceLabel: "Prognose",
          },
        }),
        historyEntry({
          forecastVersionId: "v2",
          versionNumber: 2,
          isCurrent: true,
          resultMinor: 185_166_00,
          presentation: {
            displayTitle: "Prognose",
            displaySubtitle: "Version 2",
            revisionSourceLabel: "Prognose",
          },
        }),
      ]);
      expect(points.map((p) => p.versionNumber)).toEqual([1, 2]);
      expect(resolveForecastEvolutionPointHeadline(points[1]!, "Aktuell")).toBe("Aktuell");
    });

    it("uses whole-currency management formatting in evolution chart", () => {
      expect(evolutionChart).toContain("formatFinanceManagementPlanningMinor");
      const display = formatFinanceManagementMoneyMinor(185_166_04, "CHF", "de-CH");
      expect(display).not.toMatch(/\.04/);
    });

    it("does not fabricate dates for legacy revisions", () => {
      const points = buildForecastEvolutionChartPoints([
        historyEntry({ forecastVersionId: "legacy", asOfDate: null }),
      ]);
      const secondary = formatForecastEvolutionPointSecondaryMeta({
        point: points[0]!,
        asOfLine: null,
        versionLine: "Version 1",
      });
      expect(points[0]!.asOfDate).toBeNull();
      expect(secondary).not.toMatch(/Datenstand/);
    });

    it("identifies current revision with Aktuell language", () => {
      expect(evolutionChart).toContain('data-finance-evolution-point={point.isCurrent ? "current" : "historical"}');
      expect(rolling).toContain('props.t("history.currentBadge")');
    });

    it("removes unexplained generic gridlines from evolution visualization", () => {
      expect(evolutionChart).not.toContain("0.25, 0.5, 0.75");
      expect(evolutionChart).not.toContain("<polyline");
    });
  });

  describe("change drivers", () => {
    it("exposes a zero reference axis on diverging bars", () => {
      expect(driverBars).toContain("data-finance-driver-zero-axis");
    });

    it("marks mathematical direction without favorability semantics", () => {
      expect(driverBars).toContain('data-finance-driver-direction="positive"');
      expect(driverBars).toContain('data-finance-driver-direction="negative"');
      expect(driverBars).not.toContain("favorability");
      expect(rolling).not.toContain("favorabilityFavorable");
    });
  });

  describe("regression", () => {
    it("preserves internal minor precision while rounding display", () => {
      const minor = 286_327_04;
      expect(roundAmountMinorToWholeMajorPresentation(minor, "CHF")).toBe(286_327_00);
      expect(minor).toBe(286_327_04);
    });

    it("integrates evolution and governance in one surface", () => {
      expect(rolling).toContain("data-finance-forecast-evolution");
      expect(rolling).toContain("FINANCE_FORECAST_WORKSPACE_SURFACE_CLASS");
      expect(rolling).toContain("prognoseverlauf-compact");
    });
  });
});
