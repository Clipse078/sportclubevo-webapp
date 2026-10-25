import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS,
  EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE,
  EXPECTED_FINANCIAL_EVENT_PERSISTENCE_PROPOSAL,
  EXPECTED_FINANCIAL_EVENT_PERMISSIONS,
  EXPECTED_FINANCIAL_EVENT_UX_ARCHITECTURE,
} from "@/lib/finance/forecast/expected-financial-event-architecture-contract";
import { financeForecastTimingWorkspaceMountsMovementChart } from "@/lib/finance/forecast/finance-forecast-timing-workspace-presentation";

const repoRoot = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

/** FIN-04E financial semantics paths — wall-clock must not drive reconciliation/cutoff. */
const FIN_04E_FINANCIAL_SEMANTICS_SOURCES = [
  "lib/finance/forecast/reconcile-expected-financial-timing.ts",
  "lib/finance/services/finance-expected-financial-timing-reconciliation-service.ts",
  "lib/finance/services/finance-expected-financial-event-service.ts",
  "lib/finance/services/finance-forecast-timing-query-service.ts",
  "lib/finance/forecast/build-forecast-timing-intelligence.ts",
  "lib/finance/forecast/calculate-effective-dated-scenario-assumption.ts",
] as const;

describe("FIN-04E-08 release closure contract", () => {
  it("locks programme completion pending explicit PO merge authorization", () => {
    expect(EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE.fin04eProgrammeComplete).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE.productOwnerVisualUatPassRecorded).toBe(
      true,
    );
    expect(EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE.mergeAuthorizationPending).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE.prNumber).toBe(907);
    expect(EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE.noOverviewMovementChartInFin04e).toBe(
      true,
    );
    expect(EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE.zeitplanungMovementChartMounted).toBe(
      false,
    );
    expect(
      EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE.reusableMovementChartCapabilityPreserved,
    ).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_FIN_04E_08_RELEASE_CLOSURE.nextProgrammeSlice).toBe("FIN-05");
  });

  it("preserves domain locks and persistence boundaries", () => {
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.expectedEventIsNotActual).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.noFakeMonthlyPhasing).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_ARCHITECTURE_LOCKS.liquidityDeferredToFin09).toBe(true);
    expect(EXPECTED_FINANCIAL_EVENT_PERSISTENCE_PROPOSAL.unscheduledRemainderPersisted).toBe(false);
    expect(EXPECTED_FINANCIAL_EVENT_PERSISTENCE_PROPOSAL.syntheticBalancingEventPersisted).toBe(
      false,
    );
    expect(EXPECTED_FINANCIAL_EVENT_PERMISSIONS.view).toBe("finance.forecast.view");
    expect(EXPECTED_FINANCIAL_EVENT_PERMISSIONS.manage).toBe("finance.forecast.manage");
    expect(EXPECTED_FINANCIAL_EVENT_UX_ARCHITECTURE.noNewBinaryCheckboxPatterns).toBe(true);
  });

  it("keeps R4 chart capability but not mounted on Zeitplanung workspace", () => {
    expect(financeForecastTimingWorkspaceMountsMovementChart("PARTIAL_TIMING")).toBe(false);
    expect(financeForecastTimingWorkspaceMountsMovementChart("ZERO_TIMING")).toBe(false);
    expect(financeForecastTimingWorkspaceMountsMovementChart("FULL_TIMING")).toBe(false);
    expect(readRepo("lib/finance/forecast/build-forecast-timing-movement-chart-model.ts")).toContain(
      "buildFinanceForecastTimingMovementChartModel",
    );
  });
});

describe("FIN-04E-08 system clock audit (financial semantics)", () => {
  it("does not use implicit wall-clock in reconciliation and expected-event services", () => {
    for (const relativePath of FIN_04E_FINANCIAL_SEMANTICS_SOURCES) {
      const source = readRepo(relativePath);
      expect(source, relativePath).not.toMatch(/\bnew Date\(\)/);
      expect(source, relativePath).not.toMatch(/\bDate\.now\(\)/);
    }
  });
});

describe("FIN-04E-08 documentation consistency", () => {
  it("records FIN-04E COMPLETE and PO visual UAT in architecture doc", () => {
    const architecture = readRepo("docs/finance/SCE-FINANCE-04E-FORECAST-TIMING-ARCHITECTURE.md");
    expect(architecture).toContain("FIN-04E");
    expect(architecture).toContain("COMPLETE");
    expect(architecture).toContain("Product Owner");
    expect(architecture).toContain("Overview movement visualization is not implemented in FIN-04E");
    expect(architecture).not.toContain("04E-08+** not started");
  });

  it("documents 04E-08 closure package", () => {
    const r8 = readRepo("docs/finance/SCE-FINANCE-04E-08-HARDENING-AND-RELEASE-CLOSURE.md");
    expect(r8).toContain("FIN-04E-08");
    expect(r8).toContain("Product Owner");
    expect(r8).toContain("#907");
    expect(r8).toContain("DO NOT MERGE");
  });

  it("aligns visual timing doc with R5 hierarchy and overview boundary", () => {
    const visual = readRepo("docs/finance/SCE-FINANCE-04E-07-VISUAL-TIMING-INTELLIGENCE.md");
    expect(visual).toContain("not** mounted on Zeitplanung");
    expect(visual).toContain("Understand");
    expect(visual).toContain("Manage");
    expect(visual).toContain("COMPLETE");
  });

  it("updates finance roadmap programme status", () => {
    const roadmap = readRepo("docs/roadmap/SCE-FINANCE-01.md");
    expect(roadmap).toContain("FIN-04E");
    expect(roadmap).toMatch(/FIN-04E.*COMPLETE/);
    expect(roadmap).toContain("FIN-05");
  });
});

describe("FIN-04E-08 migration guard coverage", () => {
  it("references additive FIN-04E migrations with deployment guards", () => {
    expect(
      readRepo("lib/finance/__tests__/finance-04e-02-migration-deployment-guard.test.ts"),
    ).toContain("20261024200000_sce_finance_04e_02_expected_event_persistence");
    expect(
      readRepo("lib/finance/__tests__/finance-04e-06-migration-deployment-guard.test.ts"),
    ).toContain("20261025120000_sce_finance_04e_06_scenario_assumption_effective_from");
    expect(readRepo("scripts/sce-finance-04e-02-stage-migration-verify.ts")).toContain("--phase=pre");
    expect(readRepo("scripts/sce-finance-04e-06-stage-migration-verify.ts")).toContain("--phase=pre");
  });
});

describe("FIN-04E-08 explicit permission matrix (automated suite map)", () => {
  it("documents rerun coverage across FIN-04E service, read-model, and workspace tests", () => {
    const permissionMatrixSources = [
      "lib/finance/__tests__/finance-04e-03-expected-event-services.test.ts",
      "lib/finance/__tests__/finance-04e-04-forecast-timing-read-model.test.ts",
      "lib/finance/__tests__/finance-04e-05-forecast-timing-workspace-ux.test.ts",
      "lib/finance/__tests__/finance-04e-06-effective-dated-scenarios.test.ts",
      "lib/finance/__tests__/finance-04e-expected-financial-event-architecture.test.ts",
    ] as const;

    const combined = permissionMatrixSources.map((p) => readRepo(p)).join("\n");
    expect(combined).toContain("finance.forecast.view");
    expect(combined).toContain("finance.forecast.manage");
    expect(combined).toContain("requires forecast manage permission");
    expect(combined).toContain("canMutate");
    expect(combined).toContain("source-linked mutation");
  });
});

describe("FIN-04E-08 explicit tenant isolation (automated suite map)", () => {
  it("documents isolation coverage across CRUD, read model, and source identity", () => {
    const isolationSources = [
      "lib/finance/__tests__/finance-04e-03-expected-event-services.test.ts",
      "lib/finance/__tests__/finance-04e-04-forecast-timing-read-model.test.ts",
    ] as const;
    const combined = isolationSources.map((p) => readRepo(p)).join("\n");
    expect(combined).toContain("cross-tenant");
    expect(combined).toContain("tenant-scoped uniqueness");
    expect(combined).toContain("isolates event detail by tenant");
  });
});

describe("FIN-04E-08 Prisma model audit (source review)", () => {
  it("locks FinanceExpectedFinancialEvent persistence semantics in schema", () => {
    const schema = readRepo("prisma/schema.prisma");
    const modelStart = schema.indexOf("model FinanceExpectedFinancialEvent");
    const modelBlock = schema.slice(modelStart, schema.indexOf("enum FinanceProjectionDataSufficiency"));
    const modelPreamble = schema.slice(Math.max(0, modelStart - 280), modelStart);
    expect(modelPreamble).toContain("Unscheduled remainder is derived");
    expect(modelBlock).toContain("tenantId");
    expect(modelBlock).toContain("financeYearId");
    expect(modelBlock).toContain("financialAccountId");
    expect(modelBlock).toContain("expectedAmountMinor Int");
    expect(modelBlock).toContain("onDelete: Restrict");
    expect(modelBlock).not.toContain("UNSCHEDULED");
  });
});
