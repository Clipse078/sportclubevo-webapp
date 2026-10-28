import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FinanceDomainError } from "@/lib/finance/errors";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  evaluateFinanceCommitmentApprovalRequirement,
  normalizeFinanceCommitmentApprovalPolicySnapshot,
} from "@/lib/finance/commitment/finance-commitment-approval-policy-evaluation";
import { FINANCE_COMMITMENT_APPROVAL_POLICY_DEFAULTS } from "@/lib/finance/commitment/finance-commitment-approval-policy-contract";
import {
  loadFinanceCommitmentApprovalInboxSnapshot,
  getFinanceCommitmentDetail,
} from "@/lib/finance/services/finance-commitment-query-service";
import {
  saveFinanceCommitmentApprovalPolicy,
} from "@/lib/finance/services/finance-commitment-approval-policy-service";
import {
  approveFinanceCommitmentForDomain,
  createFinanceCommitment,
  submitFinanceCommitment,
} from "@/lib/finance/services/finance-commitment-service";
import {
  commitmentCtx,
  commitmentTenantB,
  commitmentYearId,
  createCommitmentMockStore,
  makeCommitmentMockDb,
} from "@/lib/finance/__tests__/finance-07b-commitment-mock-db";

const repoRoot = process.cwd();

function readRepo(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function policyCtx(overrides?: Parameters<typeof commitmentCtx>[0]) {
  return commitmentCtx({
    permissionKeys: new Set([
      PERMISSIONS.FINANCE_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_VIEW,
      PERMISSIONS.FINANCE_COMMITMENT_MANAGE,
      PERMISSIONS.FINANCE_COMMITMENT_SUBMIT,
      PERMISSIONS.FINANCE_COMMITMENT_POLICY_MANAGE,
    ]),
    ...overrides,
  });
}

describe("FIN-07D approval policy & thresholds", () => {
  it("defaults preserve FIN-07B submit behaviour (enabled, threshold 0)", () => {
    expect(FINANCE_COMMITMENT_APPROVAL_POLICY_DEFAULTS).toEqual({
      enabled: true,
      thresholdAmountMinor: 0,
    });
    const evaluation = evaluateFinanceCommitmentApprovalRequirement({
      policy: normalizeFinanceCommitmentApprovalPolicySnapshot(null, "EUR"),
      amountMinor: 100,
      currency: "EUR",
    });
    expect(evaluation.approvalRequired).toBe(true);
  });

  it("uses inclusive >= threshold boundary", () => {
    const policy = { enabled: true, thresholdAmountMinor: 1_000_00, thresholdCurrency: "EUR" };
    expect(
      evaluateFinanceCommitmentApprovalRequirement({
        policy,
        amountMinor: 999_99,
        currency: "EUR",
      }).approvalRequired,
    ).toBe(false);
    expect(
      evaluateFinanceCommitmentApprovalRequirement({
        policy,
        amountMinor: 1_000_00,
        currency: "EUR",
      }).approvalRequired,
    ).toBe(true);
    expect(
      evaluateFinanceCommitmentApprovalRequirement({
        policy,
        amountMinor: 1_000_01,
        currency: "EUR",
      }).approvalRequired,
    ).toBe(true);
  });

  it("policy disabled yields NOT_REQUIRED on submit", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    await saveFinanceCommitmentApprovalPolicy(db as never, policyCtx(), {
      enabled: false,
      thresholdAmountMinor: 500_00,
    });
    const created = await createFinanceCommitment(db as never, policyCtx(), {
      financeYearId: commitmentYearId,
      title: "Small",
      amountMinor: 50_000_00,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    const submitted = await submitFinanceCommitment(db as never, policyCtx(), created.id);
    expect(submitted.approvalStatus).toBe("NOT_REQUIRED");
    expect(submitted.approvalPolicyEnabledSnapshot).toBe(false);
  });

  it("NOT_REQUIRED commitments are excluded from approval inbox", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    await saveFinanceCommitmentApprovalPolicy(db as never, policyCtx(), {
      enabled: true,
      thresholdAmountMinor: 1_000_00,
    });
    const created = await createFinanceCommitment(db as never, policyCtx(), {
      financeYearId: commitmentYearId,
      title: "Below threshold",
      amountMinor: 100_00,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    await submitFinanceCommitment(db as never, policyCtx(), created.id);
    const inbox = await loadFinanceCommitmentApprovalInboxSnapshot(
      db as never,
      policyCtx({
        permissionKeys: new Set([
          PERMISSIONS.FINANCE_VIEW,
          PERMISSIONS.FINANCE_COMMITMENT_VIEW,
          PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
        ]),
      }),
    );
    expect(inbox.pendingCount).toBe(0);
  });

  it("PENDING commitments appear in approval inbox", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    await saveFinanceCommitmentApprovalPolicy(db as never, policyCtx(), {
      enabled: true,
      thresholdAmountMinor: 100_00,
    });
    const created = await createFinanceCommitment(db as never, policyCtx(), {
      financeYearId: commitmentYearId,
      title: "Above threshold",
      amountMinor: 200_00,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    await submitFinanceCommitment(db as never, policyCtx(), created.id);
    const inbox = await loadFinanceCommitmentApprovalInboxSnapshot(
      db as never,
      policyCtx({
        permissionKeys: new Set([
          PERMISSIONS.FINANCE_VIEW,
          PERMISSIONS.FINANCE_COMMITMENT_VIEW,
          PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
        ]),
      }),
    );
    expect(inbox.pendingCount).toBe(1);
  });

  it("draft submit does not create approval decision history", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, policyCtx(), {
      financeYearId: commitmentYearId,
      title: "Draft only",
      amountMinor: 500_00,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    expect(store.financeCommitmentApprovalDecision).toHaveLength(0);
    await submitFinanceCommitment(db as never, policyCtx(), created.id);
    expect(store.financeCommitmentApprovalDecision).toHaveLength(0);
  });

  it("historical APPROVED decisions unaffected by later policy change", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    const created = await createFinanceCommitment(db as never, policyCtx(), {
      financeYearId: commitmentYearId,
      title: "Approved once",
      amountMinor: 500_00,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    await submitFinanceCommitment(db as never, policyCtx(), created.id);
    await approveFinanceCommitmentForDomain(
      db as never,
      policyCtx({
        permissionKeys: new Set([
          PERMISSIONS.FINANCE_VIEW,
          PERMISSIONS.FINANCE_COMMITMENT_VIEW,
          PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
        ]),
      }),
      created.id,
    );
    await saveFinanceCommitmentApprovalPolicy(db as never, policyCtx(), {
      enabled: false,
      thresholdAmountMinor: 0,
    });
    const row = store.financeCommitment.find((c) => c.id === created.id)!;
    expect(row.approvalStatus).toBe("APPROVED");
    expect(store.financeCommitmentApprovalDecision).toHaveLength(1);
  });

  it("rejects unauthorized policy mutation", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    await expect(
      saveFinanceCommitmentApprovalPolicy(
        db as never,
        policyCtx({
          permissionKeys: new Set([
            PERMISSIONS.FINANCE_VIEW,
            PERMISSIONS.FINANCE_COMMITMENT_APPROVE,
          ]),
        }),
        { enabled: true, thresholdAmountMinor: 0 },
      ),
    ).rejects.toMatchObject({ code: "FINANCE_FORBIDDEN" });
  });

  it("audits policy updates", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    await saveFinanceCommitmentApprovalPolicy(db as never, policyCtx(), {
      enabled: true,
      thresholdAmountMinor: 250_00,
    });
    expect(
      store.auditLog.some((a) => a.action === "COMMITMENT_APPROVAL_POLICY_UPDATED"),
    ).toBe(true);
  });

  it("tenant isolation — policy rows are tenant-scoped", async () => {
    const store = createCommitmentMockStore();
    store.financeCommitmentApprovalPolicy.push({
      id: "pol-b",
      tenantId: commitmentTenantB,
      enabled: true,
      thresholdAmountMinor: 999_00,
      thresholdCurrency: "EUR",
      updatedByUserId: null,
    });
    const db = makeCommitmentMockDb(store);
    await saveFinanceCommitmentApprovalPolicy(db as never, policyCtx(), {
      enabled: true,
      thresholdAmountMinor: 100_00,
    });
    expect(store.financeCommitmentApprovalPolicy).toHaveLength(2);
    expect(
      store.financeCommitmentApprovalPolicy.find((p) => p.tenantId === commitmentTenantB)
        ?.thresholdAmountMinor,
    ).toBe(999_00);
  });

  it("exposes approval explanation on submitted detail", async () => {
    const store = createCommitmentMockStore();
    const db = makeCommitmentMockDb(store);
    await saveFinanceCommitmentApprovalPolicy(db as never, policyCtx(), {
      enabled: true,
      thresholdAmountMinor: 1_000_00,
    });
    const created = await createFinanceCommitment(db as never, policyCtx(), {
      financeYearId: commitmentYearId,
      title: "Explain",
      amountMinor: 2_000_00,
      currency: "EUR",
      commitmentDate: "2026-01-01",
    });
    await submitFinanceCommitment(db as never, policyCtx(), created.id);
    const detail = await getFinanceCommitmentDetail(db as never, policyCtx(), created.id);
    expect(detail.approvalExplanation?.kind).toBe("REQUIRED_AT_OR_ABOVE_THRESHOLD");
    expect(detail.approvalExplanation?.thresholdAmountMinor).toBe(1_000_00);
  });

  it("BINARY_CONTROL_COMPLIANCE — settings use Toggle, no new checkboxes", () => {
    const settings = readRepo(
      "components/admin/finance/commitment/FinanceCommitmentApprovalPolicySettingsSection.tsx",
    );
    expect(settings).toContain("SwitchThumb");
    expect(settings).not.toContain('type="checkbox"');
    const panel = readRepo("components/admin/finance/FinanceSettingsPanel.tsx");
    expect(panel).not.toContain('type="checkbox"');
  });

  it("rejects non-positive commitment amounts at evaluation", () => {
    expect(() =>
      evaluateFinanceCommitmentApprovalRequirement({
        policy: { enabled: true, thresholdAmountMinor: 0, thresholdCurrency: "EUR" },
        amountMinor: 0,
        currency: "EUR",
      }),
    ).toThrow(FinanceDomainError);
  });
});
