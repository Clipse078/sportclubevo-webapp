import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  assertFinanceCommitmentLifecycleTransition,
  assertFinanceCommitmentMayBecomeActive,
} from "@/lib/finance/commitment/finance-commitment-lifecycle";
import {
  canApproveFinanceCommitments,
  canManageFinanceCommitments,
  canSubmitFinanceCommitments,
  canViewFinanceCommitments,
} from "@/lib/finance/commitment/finance-commitment-authorization";
import {
  FINANCE_07A_IMPLEMENTATION,
  FINANCE_07A_SCOPE,
  FINANCE_07_PACKAGE_PLAN,
  FINANCE_COMMITMENT_APPROVAL_ARCHITECTURE,
  FINANCE_COMMITMENT_BUDGET_FORECAST_INTEGRATION,
  FINANCE_COMMITMENT_CONCEPTUAL_LOCK,
  FINANCE_COMMITMENT_DESIGN_SYSTEM,
  FINANCE_COMMITMENT_EXPECTED_EVENT_INTEGRATION,
  FINANCE_COMMITMENT_LIFECYCLE,
  FINANCE_COMMITMENT_PERMISSION_MODEL,
  FINANCE_COMMITMENT_PROGRAMME_BOUNDARY,
  FINANCE_COMMITMENT_SUPPLIER_BILL_BOUNDARY,
  FINANCE_DOUBLE_COUNTING_INVARIANT,
  SCE_FINANCE_COMMITMENT_ARCHITECTURE_LOCKS,
} from "@/lib/finance/commitment/finance-commitment-architecture-contract";
import { financeCommitmentExistsForTenant } from "@/lib/finance/services/finance-commitment-foundation-query-service";
import type { FinanceAuthContext } from "@/lib/finance/finance-authorization";
import { FinanceDomainError } from "@/lib/finance/errors";

const repoRoot = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function ctx(keys: string[]): FinanceAuthContext {
  return {
    tenantId: "tenant-a",
    userId: "user-1",
    permissionKeys: new Set(keys),
  };
}

describe("FIN-07A commitment architecture locks", () => {
  it("locks conceptual boundaries and programme scope", () => {
    expect(SCE_FINANCE_COMMITMENT_ARCHITECTURE_LOCKS.commitmentDistinctFromActual).toBe(true);
    expect(SCE_FINANCE_COMMITMENT_ARCHITECTURE_LOCKS.commitmentDistinctFromPayment).toBe(true);
    expect(SCE_FINANCE_COMMITMENT_ARCHITECTURE_LOCKS.approvalStateSeparateFromLifecycle).toBe(
      true,
    );
    expect(SCE_FINANCE_COMMITMENT_ARCHITECTURE_LOCKS.countryAgnosticCore).toBe(true);
    expect(SCE_FINANCE_COMMITMENT_ARCHITECTURE_LOCKS.noFcaSpecificSemantics).toBe(true);
    expect(FINANCE_07A_SCOPE.noFullCommitmentWorkspace).toBe(false);
    expect(FINANCE_07A_SCOPE.noBudgetAvailableArithmetic).toBe(true);
    expect(FINANCE_07A_IMPLEMENTATION.fin07ProgrammeStatus).toBe("IN_PROGRESS");
  });

  it("documents FIN-07 programme boundaries", () => {
    expect(FINANCE_COMMITMENT_PROGRAMME_BOUNDARY.notBankConnectivity).toBe(true);
    expect(FINANCE_COMMITMENT_PROGRAMME_BOUNDARY.notGeneralLedger).toBe(true);
    expect(FINANCE_COMMITMENT_SUPPLIER_BILL_BOUNDARY.fin07aNoBillIngestion).toBe(true);
  });

  it("preserves double-counting invariant and expected-event integration", () => {
    expect(FINANCE_DOUBLE_COUNTING_INVARIANT.aggregationUsesObligationChainNotRawArtifactSum).toBe(
      true,
    );
    expect(FINANCE_COMMITMENT_EXPECTED_EVENT_INTEGRATION.commitmentIsBusinessGovernanceObject).toBe(
      true,
    );
    expect(
      FINANCE_COMMITMENT_EXPECTED_EVENT_INTEGRATION.fin04eConsumesTimingDoesNotDuplicateCommitmentState,
    ).toBe(true);
    expect(FINANCE_COMMITMENT_EXPECTED_EVENT_INTEGRATION.noAnnualDivideByTwelve).toBe(true);
  });

  it("defers budget/forecast arithmetic until later packages", () => {
    expect(FINANCE_COMMITMENT_BUDGET_FORECAST_INTEGRATION.silentOverwriteOfCurrentForecastForbidden).toBe(
      true,
    );
    expect(FINANCE_COMMITMENT_BUDGET_FORECAST_INTEGRATION.availableMeasureDeferred).toContain(
      "FIN-07F",
    );
  });

  it("defines a coherent FIN-07 package plan", () => {
    expect(Object.keys(FINANCE_07_PACKAGE_PLAN)).toEqual([
      "07A",
      "07B",
      "07C",
      "07D",
      "07E",
      "07F",
      "07G",
    ]);
  });
});

describe("FIN-07A lifecycle semantics", () => {
  it("allows draft → submitted → active → fulfilled", () => {
    expect(() => assertFinanceCommitmentLifecycleTransition("DRAFT", "SUBMITTED")).not.toThrow();
    expect(() => assertFinanceCommitmentLifecycleTransition("SUBMITTED", "ACTIVE")).not.toThrow();
    expect(() => assertFinanceCommitmentLifecycleTransition("ACTIVE", "FULFILLED")).not.toThrow();
  });

  it("rejects illegal transitions", () => {
    expect(() => assertFinanceCommitmentLifecycleTransition("DRAFT", "ACTIVE")).toThrow(
      FinanceDomainError,
    );
    expect(() => assertFinanceCommitmentLifecycleTransition("FULFILLED", "ACTIVE")).toThrow(
      FinanceDomainError,
    );
  });

  it("requires approval before active when policy demands it", () => {
    expect(() =>
      assertFinanceCommitmentMayBecomeActive({
        lifecycleStatus: "SUBMITTED",
        approvalStatus: "PENDING",
      }),
    ).toThrow(FinanceDomainError);
    expect(() =>
      assertFinanceCommitmentMayBecomeActive({
        lifecycleStatus: "SUBMITTED",
        approvalStatus: "APPROVED",
      }),
    ).not.toThrow();
    expect(() =>
      assertFinanceCommitmentMayBecomeActive({
        lifecycleStatus: "SUBMITTED",
        approvalStatus: "NOT_REQUIRED",
      }),
    ).not.toThrow();
  });

  it("keeps approval architecture extensible — threshold policy in 07D, not a generic rules engine", () => {
    expect(FINANCE_COMMITMENT_APPROVAL_ARCHITECTURE.v1NoConfigurableRulesEngine).toBe(false);
    expect(FINANCE_COMMITMENT_APPROVAL_ARCHITECTURE.v1AmountThresholdPolicyOnly).toBe(true);
    expect(FINANCE_COMMITMENT_LIFECYCLE.activeRequiresApprovalApprovedOrNotRequired).toBe(true);
    expect(FINANCE_COMMITMENT_CONCEPTUAL_LOCK.approvedDoesNotMeanPaid).toBe(true);
  });
});

describe("FIN-07A permission separation", () => {
  it("requires explicit keys for view, manage, submit, and approve", () => {
    const viewOnly = ctx([PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_COMMITMENT_VIEW]);
    expect(canViewFinanceCommitments(viewOnly)).toBe(true);
    expect(canManageFinanceCommitments(viewOnly)).toBe(false);
    expect(canSubmitFinanceCommitments(viewOnly)).toBe(false);
    expect(canApproveFinanceCommitments(viewOnly)).toBe(false);

    const approver = ctx([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
    ]);
    expect(canApproveFinanceCommitments(approver)).toBe(true);
    expect(canManageFinanceCommitments(approver)).toBe(false);
  });

  it("aligns contract keys with permissions catalog", () => {
    expect(FINANCE_COMMITMENT_PERMISSION_MODEL.manageDoesNotImplyApprove).toBe(true);
    expect(PERMISSIONS.FINANCE_COMMITMENT_APPROVE).toBe(
      FINANCE_COMMITMENT_PERMISSION_MODEL.commitmentApproveKey,
    );
    expect(PERMISSIONS.FINANCE_APPROVE).toBe(
      FINANCE_COMMITMENT_PERMISSION_MODEL.budgetApproveKey,
    );
  });
});

describe("FIN-07A persistence foundation", () => {
  it("declares prisma models in schema", () => {
    const schema = readRepo("prisma/schema.prisma");
    expect(schema).toContain("model FinanceCommitment");
    expect(schema).toContain("model FinanceCommitmentApprovalDecision");
    expect(schema).toContain("model FinanceEconomicEvidenceLink");
    expect(schema).toContain("economicObligationKey");
  });

  it("tenant-isolates commitment existence checks", async () => {
    const prisma = {
      financeCommitment: {
        findFirst: async (args: { where: { id: string; tenantId: string } }) => {
          if (args.where.tenantId === "tenant-a" && args.where.id === "c-1") {
            return { id: "c-1" };
          }
          return null;
        },
      },
    };
    expect(await financeCommitmentExistsForTenant(prisma as never, "tenant-a", "c-1")).toBe(true);
    expect(await financeCommitmentExistsForTenant(prisma as never, "tenant-b", "c-1")).toBe(false);
  });
});

describe("FIN-07A binary control compliance", () => {
  it("uses no new binary checkboxes in foundation UI", () => {
    const panel = readRepo(
      "components/admin/finance/commitment/FinanceCommitmentFoundationPanel.tsx",
    );
    expect(panel).not.toMatch(/type=["']checkbox["']/);
    expect(FINANCE_COMMITMENT_DESIGN_SYSTEM.newBinaryCheckboxes).toBe(0);
    expect(FINANCE_COMMITMENT_DESIGN_SYSTEM.binaryControlCompliance).toBe("PASS");
  });
});
