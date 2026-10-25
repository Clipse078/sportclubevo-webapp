import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FORECAST_PHASING_SUPPORTED } from "@/lib/finance/forecast/forecast-contract";
import {
  FINANCE_05A_SCOPE,
  FINANCE_05_PACKAGE_PLAN,
  FINANCE_MANAGEMENT_PNL_ARCHITECTURE,
  FINANCE_REPORTING_CANONICAL_MEASURES,
  FINANCE_REPORTING_DRILL_THROUGH_PATTERNS,
  FINANCE_REPORTING_FIN11_BOUNDARY,
  FINANCE_REPORTING_INFORMATION_ARCHITECTURE,
  FINANCE_REPORTING_PERMISSION_MODEL,
  FINANCE_REPORTING_PUBLICATION_BOUNDARY,
  FINANCE_REPORTING_READ_MODEL_ARCHITECTURE,
  FINANCE_UBERSICHT_VS_REPORTING_BOUNDARY,
  FINANCE_VARIANCE_INTELLIGENCE_MODEL,
  FINANCE_VISUAL_INTELLIGENCE_FAMILIES,
  FINANCE_WORKSPACE_RESPONSIBILITY_MODEL,
  SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS,
} from "@/lib/finance/reporting/finance-reporting-intelligence-architecture-contract";

const repoRoot = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("FIN-05A reporting intelligence architecture locks", () => {
  it("locks source-of-truth and programme boundaries", () => {
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.reportingIsNotSourceOfTruth).toBe(true);
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.approvedBudgetRemainsGovernanceBaseline).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.currentForecastRemainsOrganisationExpectation).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing).toBe(
      FORECAST_PHASING_SUPPORTED === false,
    );
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noLiquidityInFin05).toBe(true);
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.managementPnlIsNotStatutoryAccounting).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.noAssetLiabilityEquityInFin05Reporting).toBe(
      true,
    );
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.varianceDirectionIsSemantic).toBe(true);
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.publicationDeferredToFin06).toBe(true);
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.balanceSheetDeferredToFin11).toBe(true);
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.teamNotRequired).toBe(true);
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.overviewIsInterpretive).toBe(true);
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.reportingIsAnalytical).toBe(true);
    expect(SCE_FINANCE_REPORTING_ARCHITECTURE_LOCKS.zeitplanungIsManagementWorkspace).toBe(true);
  });

  it("defines workspace responsibilities and Übersicht vs Reporting boundary", () => {
    expect(FINANCE_WORKSPACE_RESPONSIBILITY_MODEL.UEBERSICHT.verb).toBe("UNDERSTAND");
    expect(FINANCE_WORKSPACE_RESPONSIBILITY_MODEL.REPORTING.verb).toBe("ANALYSE / EXPLAIN / PRESENT");
    expect(FINANCE_WORKSPACE_RESPONSIBILITY_MODEL.ZEITPLANUNG.verb).toBe(
      "MANAGE EXPECTED TIMING EVIDENCE",
    );
    expect(FINANCE_WORKSPACE_RESPONSIBILITY_MODEL.ZEITPLANUNG.largeMovementChartNotPrimarySurface).toBe(
      true,
    );
    expect(FINANCE_UBERSICHT_VS_REPORTING_BOUNDARY.reportingRole).toBe(
      "ANALYTICAL_INVESTIGATION_AND_EVIDENCE",
    );
    expect(FINANCE_REPORTING_DRILL_THROUGH_PATTERNS.length).toBeGreaterThanOrEqual(4);
  });

  it("anchors canonical measures to existing SCE measure constants", () => {
    expect(FINANCE_REPORTING_CANONICAL_MEASURES.APPROVED_BUDGET.sceMeasure).toBe("APPROVED_BUDGET");
    expect(FINANCE_REPORTING_CANONICAL_MEASURES.ACTUAL.sceMeasure).toBe("ACTUAL");
    expect(FINANCE_REPORTING_CANONICAL_MEASURES.CURRENT_FORECAST.sceMeasure).toBe(
      "CURRENT_FORECAST",
    );
    expect(FINANCE_VARIANCE_INTELLIGENCE_MODEL.reactComponentSignInversionForbidden).toBe(true);
    expect(FINANCE_VARIANCE_INTELLIGENCE_MODEL.zeroBaselinePercent).toContain("null");
  });

  it("defers liquidity and statutory accounting", () => {
    expect(FINANCE_VISUAL_INTELLIGENCE_FAMILIES.LIQUIDITY.notFin05).toBe(true);
    expect(FINANCE_VISUAL_INTELLIGENCE_FAMILIES.LIQUIDITY.owner).toBe("FIN-09");
    expect(FINANCE_REPORTING_FIN11_BOUNDARY.notProvided).toContain("general_ledger");
    expect(FINANCE_MANAGEMENT_PNL_ARCHITECTURE.hardcodedCategoryTreeForbidden).toBe(true);
  });

  it("preserves publication and permission boundaries", () => {
    expect(FINANCE_REPORTING_PUBLICATION_BOUNDARY.fin06OwnsShareAndPublish).toBe(true);
    expect(FINANCE_REPORTING_PERMISSION_MODEL.viewDoesNotImplyConfigure).toBe(true);
    expect(FINANCE_REPORTING_PERMISSION_MODEL.primaryView).toBe("finance.view");
  });

  it("proposes read models without FIN-05A implementation scope", () => {
    expect(FINANCE_REPORTING_READ_MODEL_ARCHITECTURE.existingFoundation).toContain(
      "FinancialReportingReadModel",
    );
    expect(FINANCE_REPORTING_READ_MODEL_ARCHITECTURE.proposedModels).toContain(
      "FinanceVarianceAnalysisReadModel",
    );
    expect(FINANCE_05A_SCOPE.noFullReportingUi).toBe(true);
    expect(FINANCE_05_PACKAGE_PLAN["05B"]).toContain("Variance Engine");
  });
});

describe("FIN-05A documentation consistency", () => {
  it("publishes canonical FIN-05 architecture document", () => {
    const doc = readRepo(
      "docs/finance/SCE-FINANCE-05-FINANCIAL-REPORTING-INTELLIGENCE-ARCHITECTURE.md",
    );
    expect(doc).toContain("FIN-05A");
    expect(doc).toContain("INTERPRETATION");
    expect(doc).toContain("NO_FAKE_MONTHLY_PHASING");
    expect(doc).toContain("finance-reporting-intelligence-architecture-contract.ts");
    expect(FINANCE_REPORTING_INFORMATION_ARCHITECTURE.every((layer) => doc.includes(layer))).toBe(
      true,
    );
  });

  it("updates finance programme roadmap for FIN-05A start", () => {
    const roadmap = readRepo("docs/roadmap/SCE-FINANCE-01.md");
    expect(roadmap).toMatch(/FIN-04E.*MERGED/);
    expect(roadmap).toContain("FIN-05A");
    expect(roadmap).not.toContain("merge pending explicit PO authorization");
  });

  it("records ADR-038 for reporting intelligence boundary", () => {
    const adr = readRepo("docs/roadmap/05-architecture-decisions.md");
    expect(adr).toContain("ADR-038");
    expect(adr).toContain("Financial Reporting & Intelligence");
  });
});
