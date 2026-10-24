import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isForecastComparisonMovementNeutral } from "@/lib/finance/forecast/forecast-evolution-presentation";

const rolling = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastRollingUxSections.tsx"),
  "utf8",
);
const panel = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceForecastWorkspacePanel.tsx"),
  "utf8",
);
const projection = readFileSync(
  join(process.cwd(), "components/admin/finance/FinanceProjectionWorkspaceSection.tsx"),
  "utf8",
);
const surfaces = readFileSync(
  join(process.cwd(), "lib/finance/finance-workspace-surfaces.ts"),
  "utf8",
);
const dialog = readFileSync(join(process.cwd(), "components/ui/Dialog.tsx"), "utf8");
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

describe("FIN-04C-05R5 workspace layout consolidation", () => {
  it("uses one shared rolling-forecast workspace surface", () => {
    expect(rolling).toContain("FINANCE_FORECAST_WORKSPACE_SURFACE_CLASS");
    expect(rolling).toContain("data-finance-rolling-forecast-workspace");
    expect(rolling).not.toContain("FINANCE_PROJECTION_CHART_SURFACE_CLASS");
    expect(rolling).not.toContain("FINANCE_FUNCTIONAL_SURFACE_CLASS");
  });

  it("integrates evolution and governance without nested chart card", () => {
    expect(rolling).toContain("data-finance-forecast-evolution");
    expect(rolling).toContain("prognoseverlauf-compact");
    expect(rolling).toContain("FINANCE_FORECAST_ANALYSIS_HEADING_CLASS");
  });

  it("zero-change state stays quiet and suppresses driver visualization", () => {
    expect(isForecastComparisonMovementNeutral({
      incomeDeltaMinor: 0,
      expenseDeltaMinor: 0,
      resultDeltaMinor: 0,
    })).toBe(true);
    expect(rolling).toContain("isForecastComparisonMovementNeutral");
    expect(rolling).toContain("data-finance-zero-change-quiet");
    expect(rolling).toContain("comparison.noChangeSincePrevious");
    expect(de).toContain("Keine Änderungen gegenüber der letzten Prognose");
  });

  it("non-zero change still renders meaningful drivers", () => {
    expect(rolling).toContain("selectMeaningfulForecastChangeDrivers");
    expect(rolling).toContain("FinanceForecastChangeDriverBars");
  });

  it("formal-reforecast dialog uses compact desktop body architecture", () => {
    expect(rolling).toContain("FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS");
    expect(rolling).toContain("bodyClassName={FINANCE_FORMAL_REFORECAST_DIALOG_BODY_CLASS}");
    expect(rolling).toContain("data-finance-formal-reforecast-dialog");
    expect(surfaces).toContain("md:flex-none md:overflow-visible");
    expect(surfaces).toContain("max-md:max-h-[min(70dvh,100%)]");
    expect(dialog).toContain("bodyClassName");
  });

  it("preserves R4 preview lifecycle reducer wiring", () => {
    expect(rolling).toContain("reduceFormalReforecastPreviewDialog");
    expect(rolling).toContain("isFormalReforecastSubmitEnabled");
    expect(rolling).toContain("buildFormalReforecastPreviewInputKey");
    expect(rolling).not.toMatch(/onChange=\{\(e\) =>[\s\S]*requestPreview/);
  });

  it("automatic forecast uses compact metadata and analytical grid", () => {
    expect(projection).toContain("data-finance-projection-meta-primary");
    expect(projection).toContain("data-finance-projection-visuals");
    expect(projection).toContain("md:grid-cols-2");
    expect(projection).toContain("embedded");
    expect(panel).not.toContain("FinanceProjectionAccountDetailSection");
  });

  it("account tables keep variance comparison architecture", () => {
    expect(panel).toContain("FINANCE_VARIANCE_COMPARISON_TABLE_CLASS");
    expect(panel).toContain("min-w-0 overflow-x-auto");
  });

  it("no new binary checkboxes in rolling UX", () => {
    expect(rolling).not.toMatch(/type="checkbox"/);
  });
});
