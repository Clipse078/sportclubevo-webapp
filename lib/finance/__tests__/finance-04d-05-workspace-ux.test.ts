import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatScenarioPercentFromBasisPoints,
  parseScenarioPercentInputToBasisPoints,
} from "@/lib/finance/forecast/scenario-assumption-presentation";

const overview = readFileSync(
  join(process.cwd(), "components/admin/finance/scenario/FinanceScenarioOverviewPanel.tsx"),
  "utf8",
);
const detail = readFileSync(
  join(process.cwd(), "components/admin/finance/scenario/FinanceScenarioDetailPanel.tsx"),
  "utf8",
);
const assumptionDialog = readFileSync(
  join(process.cwd(), "components/admin/finance/scenario/FinanceScenarioAssumptionDialog.tsx"),
  "utf8",
);
const forecastPage = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/forecast/page.tsx"),
  "utf8",
);
const scenariosPage = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/forecast/scenarios/page.tsx"),
  "utf8",
);
const scenarioDetailPage = readFileSync(
  join(
    process.cwd(),
    "app/(admin)/dashboard/finance/forecast/scenarios/[scenarioId]/page.tsx",
  ),
  "utf8",
);
const actions = readFileSync(
  join(process.cwd(), "app/(admin)/dashboard/finance/forecast/scenarios/actions.ts"),
  "utf8",
);
const subTabConfig = readFileSync(
  join(process.cwd(), "lib/finance/finance-forecast-sub-tab-config.ts"),
  "utf8",
);
const de = readFileSync(join(process.cwd(), "messages/de.json"), "utf8");

describe("FIN-04D-05 scenario workspace UX", () => {
  it("A. navigation — forecast sub-tabs and scenario routes by id", () => {
    expect(subTabConfig).toContain("/dashboard/finance/forecast/scenarios");
    expect(forecastPage).toContain("FinanceForecastSubContextTabs");
    expect(scenariosPage).toContain("loadFinanceScenarioList");
    expect(scenarioDetailPage).toContain("loadFinanceScenarioDetail");
    expect(scenarioDetailPage).toContain("params: Promise<{ scenarioId: string }>");
    expect(scenariosPage).toContain("FinanceWorkspaceTabs");
    expect(de).toContain('"scenarios": "Szenarien"');
    expect(de).toContain("Neue Variante erstellen");
  });

  it("B. overview — list hierarchy, archived filter without checkbox, empty state", () => {
    expect(overview).toContain("SceSegmentedControl");
    expect(overview).not.toMatch(/type="checkbox"/);
    expect(overview).toContain("data-finance-scenario-list-item");
    expect(overview).toContain("data-finance-scenario-empty");
    expect(overview).toContain("primaryDeltaShort");
  });

  it("C. create — dialog, current forecast source token, name conflict copy", () => {
    expect(overview).toContain("<Dialog");
    expect(overview).toContain("expectedCurrentForecastVersionId");
    expect(overview).toContain("createFinanceScenarioAction");
    expect(de).toContain("Basiert auf der aktuellen Prognose");
    expect(de).toContain("Es existiert bereits eine aktive Variante mit diesem Namen");
  });

  it("D. detail — hero result, primary delta, drivers, disclosures", () => {
    expect(detail).toContain("data-finance-scenario-result");
    expect(detail).toContain("primaryDeltaLabel");
    expect(detail).toContain("data-finance-scenario-drivers");
    expect(detail).toContain("FinanceWorkspaceDisclosure");
    expect(detail).toContain("data-finance-scenario-investigation");
    expect(detail).toContain('variant="row"');
    expect(detail).toContain("offsettingDriversIntro");
    expect(detail).not.toContain("scenarioToScenario");
  });

  it("E. assumptions — modal types, no client calculation engine", () => {
    expect(assumptionDialog).toContain("StaticOptionSearchablePicker");
    expect(assumptionDialog).toContain("PERCENT_CHANGE");
    expect(assumptionDialog).toContain("upsertFinanceScenarioAssumptionAction");
    expect(assumptionDialog).not.toMatch(/type="checkbox"/);
    expect(detail).not.toContain("calculateFinanceScenario");
  });

  it("F. freshness and live current secondary", () => {
    expect(detail).toContain('data-finance-scenario-freshness="outdated"');
    expect(detail).toContain("freshnessCurrentQuiet");
    expect(detail).toContain("data-finance-scenario-live-current");
    expect(de).toContain("gegenüber Ausgangsprognose");
  });

  it("G. lifecycle actions wired through server actions", () => {
    expect(actions).toContain("duplicateFinanceScenario");
    expect(actions).toContain("archiveFinanceScenario");
    expect(actions).toContain("restoreFinanceScenario");
    expect(actions).toContain("deleteFinanceScenario");
    expect(actions).toContain("revalidatePath");
    expect(detail).not.toContain("rebase");
    expect(detail).not.toContain("adopt");
  });

  it("H. permissions — manage gated CTAs", () => {
    expect(overview).toContain("canMutate");
    expect(detail).toContain("canMutate");
  });

  it("I. responsive overflow guard on account evidence", () => {
    expect(detail).toContain("min-w-0 overflow-x-auto");
  });

  it("J. percent basis points conversion deterministic", () => {
    expect(formatScenarioPercentFromBasisPoints(-1000)).toBe("-10");
    expect(parseScenarioPercentInputToBasisPoints("-10")).toBe(-1000);
  });
});
